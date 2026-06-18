/**
 * Envoltorio para fetch() que garantiza la comunicación JSON con Symfony.
 * Previene errores de redirección y asegura que las credenciales (cookies) viajen.
 */
async function fetchApi(url, opciones = {}) {
    const headers = {
        'Accept': 'application/json',
        ...(opciones.headers || {})
    };
    
    if (opciones.body && !(opciones.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const config = {
        ...opciones,
        headers,
        credentials: 'same-origin'
    };

    const respuesta = await fetch(url, config);
    const contentType = respuesta.headers.get('content-type');

    if (contentType && contentType.includes('text/html')) {
        throw new Error('El servidor devolvió HTML (Posible fallo fatal en Symfony).');
    }
    return respuesta;
}

// Referencias principales
const inputBusqueda = document.getElementById('busqueda');
const resultados = document.getElementById('resultados');
const estado = document.getElementById('estado');

// Botones y paneles de herramientas administrativas
const accionesAdmin = document.getElementById('accionesAdmin');
const btnExportarPdf = document.getElementById('btnExportarPdf');
const btnImportarCsv = document.getElementById('btnImportarCsv');
const btnExportarCsv = document.getElementById('btnExportarCsv');
const btnEliminarTodos = document.getElementById('btnEliminarTodos');
const inputCsv = document.getElementById('inputCsv');

// Referencias del formulario de nuevo contacto
const btnNuevo = document.getElementById('btnNuevoContacto');
const panelNuevo = document.getElementById('panelNuevo');
const guardarNuevo = document.getElementById('guardarNuevoContacto');
const cancelarNuevo = document.getElementById('cancelarNuevoContacto');

const nuevoNombre = document.getElementById('nuevoNombre');
const nuevoDepartamento = document.getElementById('nuevoDepartamento');
const nuevoExtension = document.getElementById('nuevoExtension');
const nuevoEmail = document.getElementById('nuevoEmail');

// Referencias de autenticación y perfil
const btnPerfilToggle = document.getElementById('btnPerfilToggle');
const panelPerfil = document.getElementById('panelPerfil');
const loginForm = document.getElementById('loginForm');
const loggedInPanel = document.getElementById('loggedInPanel');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const btnLogin = document.getElementById('btnLogin');
const loginError = document.getElementById('loginError');
const usuarioNombre = document.getElementById('usuarioNombre');
const rolBadge = document.getElementById('rolBadge');
const btnLogout = document.getElementById('btnLogout');

// Referencias de creación de usuario
const btnNuevoUsuario = document.getElementById('btnNuevoUsuario');
const panelNuevoUsuario = document.getElementById('panelNuevoUsuario');
const guardarNuevoUsuario = document.getElementById('guardarNuevoUsuario');
const cancelarNuevoUsuario = document.getElementById('cancelarNuevoUsuario');
const btnVerUsuarios = document.getElementById('btnVerUsuarios');
const panelUsuarios = document.getElementById('panel-usuarios');

let contactosActuales = [];
let idEditar = null;
let estadosContactos = {};
let segundosEliminar = {};
let timersEliminar = {};    
let timeoutMensaje = null;
let usuarioActual = null;

const coloresDepartamento = [
    '#000000', '#1a1a1a', '#2b2b2b', '#3d3d3d', '#4f4f4f',
    '#616161', '#737373', '#858585', '#979797', '#a9a9a9',
    '#bcbcbc', '#d0d0d0', '#e5e5e5', '#f5f5f5'
];

const coloresDepartamentos = JSON.parse(localStorage.getItem('coloresDepartamentos')) || {};

/**
 * Verifica la sesión activa contra el endpoint de Symfony
 */
async function verificarSesion() {
    try {
        const res = await fetchApi('/api/auth/check');
        const data = await res.json();
        usuarioActual = data.logueado ? data.usuario : null;
        actualizarInterfazAuth();
    } catch (e) {
        console.error('Fallo al comprobar sesión:', e);
        usuarioActual = null;
        actualizarInterfazAuth();
    }
}

/**
 * Alterna la visibilidad de las herramientas basadas en el rol
 */
function actualizarInterfazAuth() {
    if (usuarioActual) {
        accionesAdmin.style.display = 'flex';
        loginForm.classList.add('oculto');
        loggedInPanel.classList.remove('oculto');
        btnPerfilToggle.textContent = 'Mi perfil';
        usuarioNombre.textContent = usuarioActual.nombre || usuarioActual.email;
        
        const esAdmin = usuarioActual.roles.includes('ROLE_ADMIN');
        rolBadge.textContent = esAdmin ? 'Admin' : 'Mod';
        
        if (btnNuevoUsuario) btnNuevoUsuario.style.display = esAdmin ? 'block' : 'none';
        if (btnVerUsuarios) btnVerUsuarios.style.display = esAdmin ? 'block' : 'none';

    } else {
        accionesAdmin.style.display = 'none';
        loginForm.classList.remove('oculto');
        loggedInPanel.classList.add('oculto');
        btnPerfilToggle.textContent = 'Iniciar sesión';
        panelNuevo.classList.add('oculto');
        panelNuevoUsuario?.classList.add('oculto');
        
        // Oculta también el panel de gestión de usuarios si se cierra sesión
        if (panelUsuarios) panelUsuarios.classList.add('oculto');
    }
    renderizarContactos(contactosActuales);
}

btnPerfilToggle?.addEventListener('click', () => panelPerfil.classList.toggle('oculto'));
btnLogin?.addEventListener('click', async () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    
    if (!email || !password) {
        loginError.textContent = 'Rellena todos los campos';
        loginError.classList.remove('oculto');
        return;
    }

    try {
        const res = await fetchApi('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: email, username: email, password: password })
        });
        const data = await res.json();

        if (res.ok && data.ok) {
            loginError.classList.add('oculto');
            usuarioActual = data.usuario;
            actualizarInterfazAuth();
            loginEmail.value = '';
            loginPassword.value = '';
            panelPerfil.classList.add('oculto');
        } else {
            loginError.textContent = data.error || 'Credenciales inválidas';
            loginError.classList.remove('oculto');
        }
    } catch (e) {
        loginError.textContent = 'Error de conexión con el backend';
        loginError.classList.remove('oculto');
    }
});

btnLogout?.addEventListener('click', async () => {
    try {
        await fetchApi('/api/auth/logout');
    } catch (e) {
        console.error(e);
    }
    usuarioActual = null;
    actualizarInterfazAuth();
    panelPerfil.classList.add('oculto');
});

// Accesibilidad de teclado para el panel de Login
const inputsLogin = [loginEmail, loginPassword, btnLogin];
inputsLogin.forEach((input, index) => {
    input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            btnLogin.click();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            inputsLogin[index + 1]?.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            inputsLogin[index - 1]?.focus();
        } else if (e.key === 'Escape') {
            panelPerfil.classList.add('oculto');
            btnPerfilToggle.focus();
        }
    });
});

function mostrarMensaje(texto, esError = false) {
    if (!estado) return;
    if (timeoutMensaje) clearTimeout(timeoutMensaje);

    estado.innerHTML = texto; 
    estado.style.color = esError ? '#dc2626' : '#16a34a';
    estado.style.fontWeight = '700';
    
    // Solo establece el timeout si no hay botones inyectados
    if (!texto.includes('<button')) {
        timeoutMensaje = setTimeout(() => {
            estado.style.color = '#64748b';
            estado.style.fontWeight = '400';
            estado.textContent = contactosActuales.length + ' contactos';
            timeoutMensaje = null;
        }, 4000);
    }
}

// Limita la entrada a 13 dígitos
nuevoExtension?.addEventListener('input', (e) => {
    if (e.target.value.length > 13) e.target.value = e.target.value.slice(0, 13);
});

async function cargarContactos(q = '') {
    try {
        const respuesta = await fetchApi('/api/contactos?q=' + encodeURIComponent(q));
        const datos = await respuesta.json();
        contactosActuales = Array.isArray(datos) ? datos : [];
        renderizarContactos(contactosActuales);

        if (!timeoutMensaje) estado.textContent = contactosActuales.length + ' contactos';
    } catch (error) {
        mostrarMensaje('Error cargando contactos', true);
    }
}

/**
 * Inyecta la navegación lógica entre tarjetas
 */
function inyectarNavegacionTecladoTarjeta(tarjeta, contactoId) {
    tarjeta.setAttribute('tabindex', '0');

    tarjeta.addEventListener('keydown', (e) => {
        const tarjetas = Array.from(resultados.querySelectorAll('.tarjeta'));
        const index = tarjetas.indexOf(tarjeta);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const siguiente = tarjetas[index + 1];
            if (siguiente) siguiente.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const anterior = tarjetas[index - 1];
            if (anterior) anterior.focus();
            else inputBusqueda?.focus();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            const botones = Array.from(tarjeta.querySelectorAll('button'));
            if (botones.length > 0) {
                e.preventDefault();
                const botonActivo = document.activeElement;
                let idxBoton = botones.indexOf(botonActivo);

                if (idxBoton === -1) {
                    botones[0].focus();
                } else {
                    if (e.key === 'ArrowRight') idxBoton = (idxBoton + 1) % botones.length;
                    else idxBoton = (idxBoton - 1 + botones.length) % botones.length;
                    botones[idxBoton].focus();
                }
            }
        } else if (e.key === 'Escape') {
            const btnCancelar = tarjeta.querySelector('.btn-cancelar-inline, .btn-deshacer-inline');
            if (btnCancelar) {
                e.preventDefault();
                btnCancelar.click();
            }
        }
    });
}

function renderizarContactos(contactos) {
    resultados.innerHTML = '';
    contactos.forEach(contacto => {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta';
        tarjeta.id = `tarjeta-${contacto.id}`;

        if (contacto.departamento) {
            const deptoClave = contacto.departamento.trim().toLowerCase();
            if (!coloresDepartamentos[deptoClave]) {
                const colorAleatorio = coloresDepartamento[Math.floor(Math.random() * coloresDepartamento.length)];
                coloresDepartamentos[deptoClave] = colorAleatorio;
                localStorage.setItem('coloresDepartamentos', JSON.stringify(coloresDepartamentos));
            }
            tarjeta.style.borderLeftColor = coloresDepartamentos[deptoClave];
        }

        const estadoActual = estadosContactos[contacto.id] || 'normal';

        // Modo edición
        if (contacto.id === idEditar) {
            tarjeta.innerHTML = `
                <div class="tarjeta_grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;">
                    <div class="campo"><label>Nombre</label><input type="text" id="editNombre-${contacto.id}" value="${contacto.nombre}" maxlength="50" class="input-inline"></div>
                    <div class="campo"><label>Departamento</label><input type="text" id="editDepartamento-${contacto.id}" value="${contacto.departamento}" maxlength="50" class="input-inline"></div>
                    <div class="campo"><label>Extensión</label><input type="number" id="editExtension-${contacto.id}" value="${contacto.extension}" maxlength="15" class="input-inline"></div>
                    <div class="campo"><label>Correo</label><input type="email" id="editEmail-${contacto.id}" value="${contacto.email || ''}" maxlength="50" class="input-inline"></div>
                </div>
                <div class="tarjeta_acciones" style="display: flex; gap: 10px; margin-top: 14px;">
                    <button type="button" class="boton boton--guardar-edicion btn-guardar-inline">Guardar cambios</button>
                    <button type="button" class="boton boton--secundario btn-cancelar-inline">Cancelar</button>
                </div>`;

            const btnGuardar = tarjeta.querySelector('.btn-guardar-inline');
            const btnCancelar = tarjeta.querySelector('.btn-cancelar-inline');

            btnGuardar.addEventListener('click', () => guardarContactoInline(contacto.id, tarjeta));
            btnCancelar.addEventListener('click', () => {
                idEditar = null;
                renderizarContactos(contactosActuales);
                document.getElementById(`tarjeta-${contacto.id}`)?.focus();
            });

            setTimeout(() => tarjeta.querySelector(`#editNombre-${contacto.id}`)?.focus(), 50);

        // Modo cuenta atrás de eliminación
        } else if (estadoActual === 'eliminando') {
            tarjeta.classList.add('tarjeta--advertencia');
            const segs = segundosEliminar[contacto.id] ?? 5;
            tarjeta.innerHTML = `
                <div class="tarjeta_contenido">
                    <h3>${contacto.nombre}</h3>
                    <p><strong>Departamento:</strong> ${contacto.departamento}</p>
                </div>
                <div class="tarjeta_acciones-contacto">
                    <button type="button" class="boton boton--deshacer btn-deshacer-inline">Deshacer (${segs}s)</button>
                </div>
            `;
            tarjeta.querySelector('.btn-deshacer-inline').addEventListener('click', () => cancelarEliminacionIndividual(contacto.id));

        // Modo confirmación previa
        } else if (estadoActual === 'confirmar') {
            tarjeta.innerHTML = `
                <div class="tarjeta_contenido">
                    <h3>${contacto.nombre}</h3>
                    <p><strong>Departamento:</strong> ${contacto.departamento}</p>
                </div>
                <div class="tarjeta_acciones-contacto">
                    <button type="button" class="boton boton--confirmar btn-confirmar">Confirmar borrado</button>
                    <button type="button" class="boton boton--secundario btn-cancelar-inline">Cancelar</button>
                </div>
            `;
            tarjeta.querySelector('.btn-confirmar').addEventListener('click', () => iniciarContadorEliminar(contacto.id));
            tarjeta.querySelector('.btn-cancelar-inline').addEventListener('click', () => {
                estadosContactos[contacto.id] = 'normal';
                renderizarContactos(contactosActuales);
                document.getElementById(`tarjeta-${contacto.id}`)?.focus();
            });

        // Modo normal (de lectura)
        } else {
            let htmlBotones = '';
            if (usuarioActual) {
                htmlBotones = `
                    <div class="tarjeta_acciones-contacto">
                        <button type="button" class="boton boton--secundario btn-editar">Editar</button>
                        <button type="button" class="boton boton--eliminar btn-eliminar">Eliminar</button>
                    </div>`;
            }

            tarjeta.innerHTML = `
                <div class="tarjeta_contenido">
                    <h3>${contacto.nombre}</h3>
                    <p><strong>Departamento:</strong> ${contacto.departamento}</p>
                    <p><strong>Extensión:</strong> ${contacto.extension}</p>
                    <p><strong>Email:</strong> ${contacto.email || '-'}</p>
                </div>
                ${htmlBotones}`;

            if (usuarioActual) {
                tarjeta.querySelector('.btn-editar').addEventListener('click', () => {
                    idEditar = contacto.id;
                    panelNuevo.classList.add('oculto');
                    renderizarContactos(contactosActuales);
                });
                tarjeta.querySelector('.btn-eliminar').addEventListener('click', () => {
                    estadosContactos[contacto.id] = 'confirmar';
                    renderizarContactos(contactosActuales);
                    document.getElementById(`tarjeta-${contacto.id}`)?.focus();
                });
            }
        }
        
        inyectarNavegacionTecladoTarjeta(tarjeta, contacto.id);
        resultados.appendChild(tarjeta);
    });
}

async function guardarContactoInline(id, tarjeta) {
    const datos = { 
        nombre: tarjeta.querySelector(`#editNombre-${id}`).value.trim(), 
        departamento: tarjeta.querySelector(`#editDepartamento-${id}`).value.trim(), 
        extension: tarjeta.querySelector(`#editExtension-${id}`).value.trim(), 
        email: tarjeta.querySelector(`#editEmail-${id}`).value.trim() 
    };

    if (!datos.nombre || !datos.departamento || !datos.extension) {
        mostrarMensaje('Nombre, departamento y extensión obligatorios', true);
        return;
    }

    try {
        const respuesta = await fetchApi(`/api/contactos/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
        if (!respuesta.ok) {
            const resultado = await respuesta.json().catch(() => ({}));
            mostrarMensaje(resultado.error || 'Error al guardar el contacto', true);
            return;
        }
        mostrarMensaje('Contacto actualizado correctamente');
        idEditar = null;
        await cargarContactos(inputBusqueda.value);
        document.getElementById(`tarjeta-${id}`)?.focus();
    } catch (e) {
        mostrarMensaje('Fallo crítico de red', true);
    }
}

async function guardarContacto() {
    const datos = { 
        nombre: nuevoNombre.value.trim(), 
        departamento: nuevoDepartamento.value.trim(), 
        extension: nuevoExtension.value.trim(), 
        email: nuevoEmail.value.trim() 
    };

    if (!datos.nombre || !datos.departamento) {
        mostrarMensaje('Nombre y departamento son obligatorios', true);
        return;
    }
    if (datos.email && !datos.email.includes('@')) {
        mostrarMensaje('El correo debe contener al menos un @', true);
        return;
    }

    try {
        const respuesta = await fetchApi('/api/contactos', { method: 'POST', body: JSON.stringify(datos) });
        if (!respuesta.ok) {
            const resultado = await respuesta.json().catch(() => ({}));
            mostrarMensaje(resultado.error || 'Error del servidor al guardar.', true);
            return;
        }
        mostrarMensaje('Contacto añadido correctamente');
        limpiarFormulario();
        panelNuevo.classList.add('oculto');
        cargarContactos(inputBusqueda.value);
        btnNuevo?.focus();
    } catch (e) {
        mostrarMensaje('Fallo de red', true);
    }
}

function limpiarFormulario() {
    idEditar = null;
    guardarNuevo.textContent = 'Guardar cambios';
    nuevoNombre.value = '';
    nuevoDepartamento.value = '';
    nuevoExtension.value = '';
    nuevoEmail.value = '';
}

function iniciarContadorEliminar(id) {
    if (timersEliminar[id]) return;

    estadosContactos[id] = 'eliminando';
    segundosEliminar[id] = 5;
    renderizarContactos(contactosActuales);
    document.getElementById(`tarjeta-${id}`)?.focus();

    const intervaloId = setInterval(async () => {
        segundosEliminar[id]--;
        if (segundosEliminar[id] <= 0) {
            clearInterval(intervaloId);
            delete timersEliminar[id];
            delete estadosContactos[id];
            delete segundosEliminar[id];
            await ejecutarEliminacionReal(id);
        } else {
            const btn = document.getElementById(`tarjeta-${id}`)?.querySelector('.btn-deshacer-inline');
            if (btn) btn.textContent = `Deshacer (${segundosEliminar[id]}s)`;
        }
    }, 1000);

    timersEliminar[id] = intervaloId;
}

function cancelarEliminacionIndividual(id) {
    if (timersEliminar[id]) clearInterval(timersEliminar[id]);
    delete timersEliminar[id];
    estadosContactos[id] = 'normal';
    delete segundosEliminar[id];
    renderizarContactos(contactosActuales);
    document.getElementById(`tarjeta-${id}`)?.focus();
}

async function ejecutarEliminacionReal(id) {
    try {
        const respuesta = await fetchApi(`/api/contactos/${id}`, { method: 'DELETE' });
        if (!respuesta.ok) {
            const resultado = await respuesta.json().catch(() => ({}));
            mostrarMensaje(resultado.error || 'Error del servidor durante la eliminación.', true);
        } else {
            mostrarMensaje('Contacto eliminado correctamente');
        }
        cargarContactos(inputBusqueda.value);
    } catch (e) {
        mostrarMensaje('Error de conexión al eliminar', true);
        cargarContactos(inputBusqueda.value);
    }
}

/**
 * Eliminación masiva. Se inyectan controles directamente en el DOM para la fase de confirmación.
 */
function eliminarTodosContactos() {
    if (!contactosActuales.length) {
        mostrarMensaje('No hay contactos para eliminar', true);
        return;
    }

    if (timeoutMensaje) {
        clearTimeout(timeoutMensaje);
        timeoutMensaje = null;
    }

    // Fase 1: Inyección visual de primera advertencia
    estado.style.color = '';
    estado.style.fontWeight = '';
    estado.innerHTML = `
        <div style="display:flex; gap:12px; align-items:center; justify-content:center; background:#fee2e2; padding:8px 14px; border-radius:6px; border: 1px solid #ef4444;">
            <span style="font-weight:700; color:#dc2626;">¿Deseas iniciar la eliminación masiva de contactos?</span>
            <button type="button" id="btnFase1Aceptar" class="boton boton--eliminar" style="padding: 4px 10px; font-size: 13px;">Eliminar todo</button>
            <button type="button" id="btnFase1Cancelar" class="boton boton--secundario" style="padding: 4px 10px; font-size: 13px;" autofocus>Cancelar</button>
        </div>`;

    // Cancelar Fase 1
    document.getElementById('btnFase1Cancelar').addEventListener('click', () => {
        mostrarMensaje('Acción cancelada');
        cargarContactos(inputBusqueda.value);
    });

    // Generar CSV y pasar a Fase 2
    document.getElementById('btnFase1Aceptar').addEventListener('click', () => {
        exportarCSV(true);

        // Fase 2: Confirmación definitiva
        estado.innerHTML = `
            <div style="display:flex; gap:12px; align-items:center; justify-content:center; background:#fee2e2; padding:8px 14px; border-radius:6px; border: 1px solid #ef4444;">
                <span style="font-weight:700; color:#dc2626;">Respaldo CSV creado. ¿Confirmas la eliminación definitiva de todos los contactos?</span>
                <button type="button" id="btnFase2Confirmar" class="boton boton--eliminar" style="padding: 4px 10px; font-size: 13px;">Confirmar borrado masivo</button>
                <button type="button" id="btnFase2Cancelar" class="boton boton--secundario" style="padding: 4px 10px; font-size: 13px;" autofocus>Cancelar</button>
            </div>`;

        // Cancelar Fase 2
        document.getElementById('btnFase2Cancelar').addEventListener('click', () => {
            mostrarMensaje('Acción cancelada de forma segura');
            cargarContactos(inputBusqueda.value);
        });

        // Pasar a Fase 3 (cuenta atrás)
        document.getElementById('btnFase2Confirmar').addEventListener('click', () => {
            let segundos = 5;
            let cancelado = false;

            estado.innerHTML =
                `<div style="display:flex; gap:12px; align-items:center; justify-content:center;">
                    <span style="font-weight:700; color:#dc2626;">Borrando todos los contacto en: <span id="contadorMasivo">${segundos}s</span></span>
                    <button type="button" id="btnCancelarMasivoFinal" class="boton boton--deshacer" autofocus>Abortar</button>
                </div>`;

            const btnCancelarMasivo = document.getElementById('btnCancelarMasivoFinal');
            const contadorMasivo = document.getElementById('contadorMasivo');

            const intervalo = setInterval(async () => {
                if (cancelado) return;
                segundos--;

                if (segundos > 0) {
                    if (contadorMasivo) contadorMasivo.textContent = `${segundos}s`;
                } else {
                    clearInterval(intervalo);
                    try {
                        const respuesta = await fetchApi('/api/contactos/batch/todos', { method: 'DELETE' });
                        if (!respuesta.ok) {
                            const res = await respuesta.json().catch(() => ({}));
                            mostrarMensaje(res.error || 'Error del servidor durante la eliminación', true);
                            return;
                        }
                        await cargarContactos(inputBusqueda.value);
                        mostrarMensaje('Limpieza completa realizada exitosamente');
                    } catch (e) {
                        mostrarMensaje('Fallo al limpiar la base de datos', true);
                        cargarContactos(inputBusqueda.value);
                    }
                }
            }, 1000);

            // Abortar en Fase 3
            btnCancelarMasivo?.addEventListener('click', () => {
                cancelado = true;
                clearInterval(intervalo);
                mostrarMensaje('Eliminación masiva abortada');
                cargarContactos(inputBusqueda.value);
            });
        });
    });
}

function exportarCSV(esRespaldo = false) {
    if (!contactosActuales.length) {
        if (!esRespaldo) mostrarMensaje('No hay contactos para exportar', true);
        return;
    }
    const escapar = (val) => `"${String(val ?? '').replace(/"/g, '""').trim()}"`;
    let csv = 'nombre,departamento,extension,email\n';
    contactosActuales.forEach(c => csv += [escapar(c.nombre), escapar(c.departamento), escapar(c.extension), escapar(c.email)].join(',') + '\n');
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'contactos.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (!esRespaldo) mostrarMensaje('Archivo CSV generado');
}

async function importarCSV(archivo) {
    const formData = new FormData();
    formData.append('archivo_csv', archivo);
    try {
        const respuesta = await fetchApi('/api/contactos/importar', { method: 'POST', body: formData });
        const datos = await respuesta.json();
        mostrarMensaje(datos.mensaje || datos.error, !respuesta.ok || !datos.ok);
        cargarContactos(inputBusqueda.value);
    } catch (e) {
        mostrarMensaje('Error de red al importar', true);
    }
}

/**
 * Carga jsPDF asíncronamente
 */
async function cargarDependenciasPdf() {
    if (window.jspdf) return true;
    
    mostrarMensaje('Inicializando motor PDF', false);
    
    try {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        return true;
    } catch (e) {
        mostrarMensaje('No se pudo descargar jsPDF.', true);
        return false;
    }
}

btnExportarPdf?.addEventListener('click', async () => {
    const libreriaLista = await cargarDependenciasPdf();
    if (!libreriaLista) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Buscador de contactos - PDF', 14, 20);
    
    const filas = contactosActuales.map(c => [c.nombre, c.departamento, c.extension, c.email || '-']);
    doc.autoTable({ startY: 30, head: [['Nombre', 'Departamento', 'Extension', 'Email']], body: filas });
    doc.save('Listado_Contactos.pdf');
    mostrarMensaje('PDF generado correctamente');
});

btnNuevoUsuario?.addEventListener('click', () => {
    panelNuevoUsuario.classList.remove('oculto');
    document.getElementById('nuevoUsuarioNombre').value = '';
    document.getElementById('nuevoUsuarioEmail').value = '';
    document.getElementById('nuevoUsuarioPassword').value = '';
    document.getElementById('nuevoUsuarioNombre').focus();
});

cancelarNuevoUsuario?.addEventListener('click', () => panelNuevoUsuario.classList.add('oculto'));
guardarNuevoUsuario?.addEventListener('click', async () => {
    const email = document.getElementById('nuevoUsuarioEmail').value.trim();
    const password = document.getElementById('nuevoUsuarioPassword').value.trim();
    const nombre = document.getElementById('nuevoUsuarioNombre').value.trim(); // <-- CAPTURAR NOMBRE

    if (!email.includes('@') || !password || !nombre) {
        mostrarMensaje('Rellena todos los campos', true);
        return;
    }

    try {
        const res = await fetchApi('/api/users', {
            method: 'POST',
            // <-- INCLUIR EL NOMBRE EN EL JSON
            body: JSON.stringify({ email, password, nombre, roles: ['ROLE_ELEVATED'] }) 
        });
        
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            mostrarMensaje(data.error || 'Error del servidor durante la creación del usuario', true);
            return;
        }

        mostrarMensaje('Usuario creado exitosamente');
        panelNuevoUsuario.classList.add('oculto');
    } catch (e) {
        mostrarMensaje('Fallo de red al crear usuario', true);
    }
});

inputBusqueda?.addEventListener('input', () => cargarContactos(inputBusqueda.value));
inputBusqueda?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        resultados.querySelector('.tarjeta')?.focus();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        btnNuevo?.focus();
    }
});

btnNuevo?.addEventListener('click', () => {
    limpiarFormulario();
    idEditar = null; 
    renderizarContactos(contactosActuales);
    panelNuevo.classList.toggle('oculto');
    if (!panelNuevo.classList.contains('oculto')) {
        panelNuevo.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => nuevoNombre.focus(), 300);
    }
});

cancelarNuevo?.addEventListener('click', () => {
    panelNuevo.classList.add('oculto');
    limpiarFormulario();
    renderizarContactos(contactosActuales);
    btnNuevo?.focus();
});

guardarNuevo?.addEventListener('click', guardarContacto);

btnExportarCsv?.addEventListener('click', () => exportarCSV(false));
btnImportarCsv?.addEventListener('click', () => inputCsv.click());
btnEliminarTodos?.addEventListener('click', eliminarTodosContactos);
inputCsv?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) importarCSV(e.target.files[0]);
    e.target.value = '';
});

// Arranque
verificarSesion();
cargarContactos();

// Referencias al nuevo contenedor integrado
const contenedorListaUsuarios = document.getElementById('contenedorListaUsuarios');
const listaUsuariosUl = document.getElementById('lista-usuarios-ul');

/**
 * Muestra u oculta la lista de usuarios dentro del panel de sesión
 */
async function cargarListadoUsuarios() {
    try {
        // Usam fetchApi para enviar automáticamente la sesión de Symfony
        const respuesta = await fetchApi('/api/users');

        if (!respuesta.ok) {
            throw new Error('No tienes permisos o hubo un error en el servidor');
        }

        const datos = await respuesta.json();
        renderizarUsuarios(datos.usuarios);
        
        // Muestra el panel original de abajo y le damos el foco
        panelUsuarios.classList.remove('oculto');
        panelUsuarios.focus();

    } catch (error) {
        console.error('Error al cargar la lista de usuarios:', error);
        mostrarMensaje('Error al cargar usuarios. Comprueba tus permisos.', true);
    }
}

/**
 * Renderiza los usuarios de forma limpia dentro del desplegable
 */
function renderizarUsuarios(usuarios) {
    listaUsuariosUl.innerHTML = ''; 

    usuarios.forEach(usuario => {
        const li = document.createElement('li');
        li.tabIndex = 0;
        li.setAttribute('role', 'listitem');
        li.style.cssText = "display: flex; flex-direction: column; padding: 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 13px; outline: none; transition: border-color 0.2s;";
        
        const esAdmin = usuario.roles.includes('ROLE_ADMIN');
        const rolBadge = esAdmin ? 
            '<span style="background: #fee2e2; color: #dc2626; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase;">Admin</span>' : 
            '<span style="background: #dbeafe; color: #2563eb; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase;">Mod</span>';

        li.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">${usuario.nombre || 'Sin nombre'}</strong>
                ${rolBadge}
            </div>
            <span style="color: #64748b; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${usuario.email}</span>`;

        // Navegación y accesibilidad visual
        li.addEventListener('focus', () => li.style.borderColor = '#8b5cf6');
        li.addEventListener('blur', () => li.style.borderColor = '#e2e8f0');
        li.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                console.log('Usuario interactuado:', usuario.email);
            }
        });
        listaUsuariosUl.appendChild(li);
    });
}

// Asignar el evento al botón
btnVerUsuarios?.addEventListener('click', cargarListadoUsuarios);

// Cerrar el panel flotante general al dar a escape, limpiando también la lista
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panelPerfil && !panelPerfil.classList.contains('oculto')) {
        panelPerfil.classList.add('oculto');
        btnPerfilToggle.focus();
        if (contenedorListaUsuarios) {
            contenedorListaUsuarios.classList.add('oculto');
            btnVerUsuarios.textContent = 'Ver lista de usuarios';
        }
    }
});