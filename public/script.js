// Utilidad principal para evitar que Symfony rompa el JS con redirecciones HTML
async function fetchApi(url, opciones = {}) {
    const headers = {
        'Accept': 'application/json', // Fuerza a Symfony a devolver errores en JSON, no en HTML
        ...(opciones.headers || {})
    };
    
    if (opciones.body && !(opciones.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const config = {
        ...opciones,
        headers,
        credentials: 'same-origin' // Envía la cookie de sesión automáticamente
    };

    const respuesta = await fetch(url, config);
    
    const contentType = respuesta.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
        throw new Error('El servidor devolvió HTML (Posible fallo de sesión o ruta).');
    }

    return respuesta;
}

// --- REFERENCIAS DOM ---
const inputBusqueda = document.getElementById('busqueda');
const resultados = document.getElementById('resultados');
const estado = document.getElementById('estado');

// Botones y paneles de cabecera
const accionesAdmin = document.getElementById('accionesAdmin');
const btnExportarPdf = document.getElementById('btnExportarPdf');
const btnImportarCsv = document.getElementById('btnImportarCsv');
const btnExportarCsv = document.getElementById('btnExportarCsv');
const btnEliminarTodos = document.getElementById('btnEliminarTodos');
const inputCsv = document.getElementById('inputCsv');

// Nuevo contacto
const btnNuevo = document.getElementById('btnNuevoContacto');
const panelNuevo = document.getElementById('panelNuevo');
const guardarNuevo = document.getElementById('guardarNuevoContacto');
const cancelarNuevo = document.getElementById('cancelarNuevoContacto');
const nuevoNombre = document.getElementById('nuevoNombre');
const nuevoDepartamento = document.getElementById('nuevoDepartamento');
const nuevoExtension = document.getElementById('nuevoExtension');
const nuevoEmail = document.getElementById('nuevoEmail');

// --- REFERENCIAS AUTH ---
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
const btnNuevoUsuario = document.getElementById('btnNuevoUsuario');

const panelNuevoUsuario = document.getElementById('panelNuevoUsuario');
const guardarNuevoUsuario = document.getElementById('guardarNuevoUsuario');
const cancelarNuevoUsuario = document.getElementById('cancelarNuevoUsuario');

// --- ESTADO GLOBAL ---
let contactosActuales = [];
let idEditar = null;
let estadosContactos = {};
let segundosEliminar = {};
let timersEliminar = {};    
let timeoutMensaje = null;
let usuarioActual = null; // Control de sesión

const coloresDepartamento = [
    '#000000', '#1a1a1a', '#2b2b2b', '#3d3d3d', '#4f4f4f',
    '#616161', '#737373', '#858585', '#979797', '#a9a9a9',
    '#bcbcbc', '#d0d0d0', '#e5e5e5', '#f5f5f5'
];
const coloresDepartamentos = JSON.parse(localStorage.getItem('coloresDepartamentos')) || {};

// --- SISTEMA DE AUTENTICACIÓN ---
async function verificarSesion() {
    try {
        const res = await fetchApi('/api/auth/check');
        const data = await res.json();
        usuarioActual = data.logueado ? data.usuario : null;
        actualizarInterfazAuth();
    } catch (e) {
        console.error(e);
        usuarioActual = null;
        actualizarInterfazAuth();
    }
}

function actualizarInterfazAuth() {
    if (usuarioActual) {
        accionesAdmin.style.display = 'flex';
        loginForm.classList.add('oculto');
        loggedInPanel.classList.remove('oculto');
        btnPerfilToggle.textContent = 'Mi Perfil';
        usuarioNombre.textContent = usuarioActual.nombre || usuarioActual.email;
        
        const esAdmin = usuarioActual.roles.includes('ROLE_ADMIN');
        rolBadge.textContent = esAdmin ? 'Admin' : 'Editor';
        if (btnNuevoUsuario) btnNuevoUsuario.style.display = esAdmin ? 'block' : 'none';
    } else {
        accionesAdmin.style.display = 'none';
        loginForm.classList.remove('oculto');
        loggedInPanel.classList.add('oculto');
        btnPerfilToggle.textContent = 'Iniciar Sesión';
        panelNuevo.classList.add('oculto');
        panelNuevoUsuario?.classList.add('oculto');
    }
    // Repintar para mostrar/ocultar los botones de editar y eliminar
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
        // Symfony suele requerir "username" para el json_login genérico
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
        loginError.textContent = 'Error de conexión';
        loginError.classList.remove('oculto');
    }
});

btnLogout?.addEventListener('click', async () => {
    await fetchApi('/api/auth/logout');
    usuarioActual = null;
    actualizarInterfazAuth();
    panelPerfil.classList.add('oculto');
});

// Navegación por teclado panel login
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


// --- LÓGICA PRINCIPAL DE CONTACTOS ---
function mostrarMensaje(texto, esError = false) {
    if (!estado) return;
    if (timeoutMensaje) clearTimeout(timeoutMensaje);

    estado.textContent = texto;
    estado.style.color = esError ? '#dc2626' : '#16a34a';
    estado.style.fontWeight = '700';
    timeoutMensaje = setTimeout(() => {
        estado.style.color = '#64748b';
        estado.style.fontWeight = '400';
        estado.textContent = contactosActuales.length + ' contactos';
        timeoutMensaje = null;
    }, 4000);
}

nuevoExtension?.addEventListener('input', (e) => {
    if (e.target.value.length > 4) e.target.value = e.target.value.slice(0, 4);
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
                </div>
            `;

            const editExtension = tarjeta.querySelector(`#editExtension-${contacto.id}`);
            editExtension?.addEventListener('input', (e) => {
                if (e.target.value.length > 4) e.target.value = e.target.value.slice(0, 4);
            });

            const btnGuardar = tarjeta.querySelector('.btn-guardar-inline');
            const btnCancelarInline = tarjeta.querySelector('.btn-cancelar-inline');

            btnGuardar.addEventListener('click', () => guardarContactoInline(contacto.id, tarjeta));
            btnCancelarInline.addEventListener('click', () => {
                idEditar = null;
                renderizarContactos(contactosActuales);
                document.getElementById(`tarjeta-${contacto.id}`)?.focus();
            });

            const inputsInline = [
                tarjeta.querySelector(`#editNombre-${contacto.id}`),
                tarjeta.querySelector(`#editDepartamento-${contacto.id}`),
                tarjeta.querySelector(`#editExtension-${contacto.id}`),
                tarjeta.querySelector(`#editEmail-${contacto.id}`),
                btnGuardar, btnCancelarInline
            ];

            inputsInline.forEach((input, index) => {
                input?.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && input.tagName === 'INPUT') {
                        e.preventDefault();
                        guardarContactoInline(contacto.id, tarjeta);
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        btnCancelarInline.click();
                    } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        inputsInline[index + 1]?.focus();
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        inputsInline[index - 1]?.focus();
                    }
                });
            });

            setTimeout(() => inputsInline[0]?.focus(), 50);

        } else if (estadoActual === 'eliminando') {
            tarjeta.classList.add('tarjeta--advertencia');
            const segs = segundosEliminar[contacto.id] ?? 5;
            tarjeta.innerHTML = `
                <div class="tarjeta_contenido">
                    <h3>${contacto.nombre}</h3>
                    <p><strong>Departamento:</strong> ${contacto.departamento}</p>
                    <p><strong>Extensión:</strong> ${contacto.extension}</p>
                    <p><strong>Email:</strong> ${contacto.email || '-'}</p>
                </div>
                <div class="tarjeta_acciones-contacto">
                    <button type="button" class="boton boton--deshacer btn-deshacer-inline">Deshacer (${segs}s)</button>
                </div>
            `;
            tarjeta.querySelector('.btn-deshacer-inline').addEventListener('click', () => cancelarEliminacionIndividual(contacto.id));
            inyectarNavegacionTecladoTarjeta(tarjeta, contacto.id);

        } else if (estadoActual === 'confirmar') {
            tarjeta.innerHTML = `
                <div class="tarjeta_contenido">
                    <h3>${contacto.nombre}</h3>
                    <p><strong>Departamento:</strong> ${contacto.departamento}</p>
                    <p><strong>Extensión:</strong> ${contacto.extension}</p>
                    <p><strong>Email:</strong> ${contacto.email || '-'}</p>
                </div>
                <div class="tarjeta_acciones-contacto">
                    <button type="button" class="boton boton--confirmar btn-confirmar">Confirmar</button>
                    <button type="button" class="boton boton--secundario btn-cancelar-inline">Cancelar</button>
                </div>
            `;
            tarjeta.querySelector('.btn-confirmar').addEventListener('click', () => iniciarContadorEliminar(contacto.id));
            tarjeta.querySelector('.btn-cancelar-inline').addEventListener('click', () => {
                estadosContactos[contacto.id] = 'normal';
                renderizarContactos(contactosActuales);
                document.getElementById(`tarjeta-${contacto.id}`)?.focus();
            });
            inyectarNavegacionTecladoTarjeta(tarjeta, contacto.id);

        } else {
            // Lógica para que botones sólo salgan si se está logueado
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
                ${htmlBotones}
            `;

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
            inyectarNavegacionTecladoTarjeta(tarjeta, contacto.id);
        }
        resultados.appendChild(tarjeta);
    });
}

async function guardarContactoInline(id, tarjeta) {
    const nombreVal = tarjeta.querySelector(`#editNombre-${id}`).value.trim();
    const deptoVal = tarjeta.querySelector(`#editDepartamento-${id}`).value.trim();
    const extVal = tarjeta.querySelector(`#editExtension-${id}`).value.trim();
    const emailVal = tarjeta.querySelector(`#editEmail-${id}`).value.trim();

    if (!nombreVal || !deptoVal || !extVal) {
        mostrarMensaje('Nombre, departamento y extensión son obligatorios', true);
        return;
    }
    if (emailVal && !emailVal.includes('@')) {
        mostrarMensaje('El correo electrónico debe ser válido', true);
        return;
    }

    const datos = { nombre: nombreVal, departamento: deptoVal, extension: extVal, email: emailVal };

    try {
        const respuesta = await fetchApi(`/api/contactos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(datos)
        });
        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.ok) {
            mostrarMensaje(resultado.error || 'Error guardando', true);
            return;
        }

        mostrarMensaje('Contacto actualizado correctamente');
        idEditar = null;
        await cargarContactos(inputBusqueda.value);
        document.getElementById(`tarjeta-${id}`)?.focus();
    } catch (error) {
        mostrarMensaje('Error de conexión', true);
    }
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
            const tarjeta = document.getElementById(`tarjeta-${id}`);
            if (tarjeta) {
                const btn = tarjeta.querySelector('.btn-deshacer-inline');
                if (btn) btn.textContent = `Deshacer (${segundosEliminar[id]}s)`;
            }
        }
    }, 1000);

    timersEliminar[id] = intervaloId;
}

function cancelarEliminacionIndividual(id) {
    if (timersEliminar[id]) {
        clearInterval(timersEliminar[id]);
        delete timersEliminar[id];
    }
    estadosContactos[id] = 'normal';
    delete segundosEliminar[id];
    renderizarContactos(contactosActuales);
    document.getElementById(`tarjeta-${id}`)?.focus();
}

async function ejecutarEliminacionReal(id) {
    try {
        const respuesta = await fetchApi(`/api/contactos/${id}`, { method: 'DELETE' });
        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.ok) {
            mostrarMensaje(resultado.error || 'Error al eliminar', true);
        } else {
            mostrarMensaje('Contacto eliminado correctamente');
        }
        cargarContactos(inputBusqueda.value);
    } catch (error) {
        mostrarMensaje('Error de conexión al eliminar', true);
        cargarContactos(inputBusqueda.value);
    }
}

async function eliminarTodosContactos() {
    if (!contactosActuales.length) {
        mostrarMensaje('No hay contactos para eliminar', true);
        return;
    }

    const primerSeguro = confirm('Vas a eliminar todos los contactos. ¿Deseas continuar?');
    if (!primerSeguro) return;

    exportarCSV(true);
    let exploradorActivo = false;
    const marcarBlur = () => { exploradorActivo = true; };
    window.addEventListener('blur', marcarBlur);

    setTimeout(() => {
        window.removeEventListener('blur', marcarBlur);
        const continuarAlContador = () => {
            const segundoSeguro = confirm('¿Estás seguro de completar esta acción?');
            if (!segundoSeguro) { cargarContactos(inputBusqueda.value); return; }

            const tercerSeguro = confirm('ADVERTENCIA FINAL: Acción irreversible.\n¿Borrar TODOS los contactos definitivamente?');
            if (!tercerSeguro) { cargarContactos(inputBusqueda.value); return; }

            let segundos = 5;
            let cancelado = false;

            if (timeoutMensaje) { clearTimeout(timeoutMensaje); timeoutMensaje = null; }

            estado.innerHTML =
                `<div style="display:flex; gap:12px; align-items:center; justify-content:center;">
                    <span style="font-weight:700; color:#dc2626;">Eliminación en: <span id="contadorMasivo">${segundos}s</span></span>
                    <button type="button" id="btnCancelarMasivo" class="boton boton--deshacer" autofocus>Cancelar</button>
                </div>`;
            estado.style.color = '';
            estado.style.fontWeight = '';

            const btnCancelarMasivo = document.getElementById('btnCancelarMasivo');
            const contadorMasivo = document.getElementById('contadorMasivo');
            btnCancelarMasivo?.focus();

            const intervalo = setInterval(async () => {
                if (cancelado) return;
                segundos--;

                if (segundos > 0) {
                    if (contadorMasivo) contadorMasivo.textContent = `${segundos}s`;
                } else {
                    clearInterval(intervalo);
                    try {
                        const respuesta = await fetchApi('/api/contactos/batch/todos', { method: 'DELETE' });
                        const resultado = await respuesta.json();

                        if (!respuesta.ok || !resultado.ok) {
                            mostrarMensaje(resultado.error || 'Error eliminando', true);
                            return;
                        }
                        await cargarContactos(inputBusqueda.value);
                        mostrarMensaje(`Se han eliminado ${resultado.cantidad || 0} contactos correctamente`);
                    } catch (error) {
                        mostrarMensaje('Error de conexión al eliminar los contactos', true);
                        cargarContactos(inputBusqueda.value);
                    }
                }
            }, 1000);

            btnCancelarMasivo?.addEventListener('click', () => {
                cancelado = true;
                clearInterval(intervalo);
                mostrarMensaje('Eliminación masiva cancelada de forma segura');
                cargarContactos(inputBusqueda.value);
                btnNuevo?.focus();
            });
        };

        if (exploradorActivo) {
            const recuperarFocus = () => { setTimeout(continuarAlContador, 200); };
            window.addEventListener('focus', recuperarFocus, { once: true });
        } else {
            continuarAlContador();
        }
    }, 250);
}

function limpiarFormulario() {
    idEditar = null;
    guardarNuevo.textContent = 'Guardar cambios';
    nuevoNombre.value = '';
    nuevoDepartamento.value = '';
    nuevoExtension.value = '';
    nuevoEmail.value = '';
}

async function guardarContacto() {
    const nombreVal = nuevoNombre.value.trim();
    const deptoVal = nuevoDepartamento.value.trim();
    const extVal = nuevoExtension.value.trim();
    const emailVal = nuevoEmail.value.trim();

    if (!nombreVal || !deptoVal || !extVal) {
        mostrarMensaje('Nombre, departamento y extensión son obligatorios', true);
        return;
    }
    if (emailVal && !emailVal.includes('@')) {
        mostrarMensaje('El correo electrónico debe ser válido', true);
        return;
    }

    const datos = { nombre: nombreVal, departamento: deptoVal, extension: extVal, email: emailVal };

    try {
        const respuesta = await fetchApi('/api/contactos', {
            method: 'POST',
            body: JSON.stringify(datos)
        });
        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.ok) {
            mostrarMensaje(resultado.error || 'Error guardando', true);
            return;
        }

        mostrarMensaje('Contacto añadido correctamente');
        limpiarFormulario();
        panelNuevo.classList.add('oculto');
        cargarContactos(inputBusqueda.value);
        btnNuevo?.focus();
    } catch (error) {
        mostrarMensaje('Error de conexión', true);
    }
}

// Eventos del buscador superior
inputBusqueda?.addEventListener('input', () => cargarContactos(inputBusqueda.value));
inputBusqueda?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        const primeraTarjeta = resultados.querySelector('.tarjeta');
        if (primeraTarjeta) primeraTarjeta.focus();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        btnNuevo?.focus();
    }
});

// Eventos de cabecera admin
const botonesCabecera = [btnNuevo, btnExportarPdf, btnImportarCsv, btnExportarCsv, btnEliminarTodos];
botonesCabecera.forEach((btn, index) => {
    btn?.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            botonesCabecera[(index + 1) % botonesCabecera.length]?.focus();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            botonesCabecera[(index - 1 + botonesCabecera.length) % botonesCabecera.length]?.focus();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            inputBusqueda?.focus();
        }
    });
});

btnNuevo?.addEventListener('click', () => {
    limpiarFormulario();
    idEditar = null; 
    renderizarContactos(contactosActuales);
    guardarNuevo.textContent = 'Guardar contacto';
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

const inputsTop = [nuevoNombre, nuevoDepartamento, nuevoExtension, nuevoEmail, guardarNuevo, cancelarNuevo];
inputsTop.forEach((input, index) => {
    input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.tagName === 'INPUT') {
            e.preventDefault();
            guardarContacto();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelarNuevo.click();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            inputsTop[index + 1]?.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            inputsTop[index - 1]?.focus();
        }
    });
});

// Exportación PDF (Solo asegúrate de haber añadido el CDN en el HTML)
btnExportarPdf?.addEventListener('click', () => {
    if (!window.jspdf) { mostrarMensaje('jsPDF no cargado', true); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Listado de contactos', 14, 20);
    const filas = contactosActuales.map(c => [c.nombre, c.departamento, c.extension, c.email || '-']);
    doc.autoTable({ startY: 30, head: [['Nombre', 'Departamento', 'Extension', 'Email']], body: filas });
    doc.save('contactos.pdf');
});

// CSV Export / Import
function exportarCSV(esRespaldo = false) {
    if (!contactosActuales.length) {
        if (!esRespaldo) mostrarMensaje('No hay contactos para exportar.', true);
        return;
    }
    const escaparCSV = (valor) => `"${String(valor ?? '').replace(/"/g, '""').trim()}"`;
    let csv = 'nombre,departamento,extension,email\n';
    contactosActuales.forEach(c => {
        csv += [escaparCSV(c.nombre), escaparCSV(c.departamento), escaparCSV(c.extension), escaparCSV(c.email)].join(',') + '\n';
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = 'contactos.csv';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    if (!esRespaldo) mostrarMensaje('CSV exportado correctamente.', false);
}

async function importarCSV(archivo) {
    const formData = new FormData();
    formData.append('archivo_csv', archivo);
    try {
        const respuesta = await fetchApi('/api/contactos/importar', { method: 'POST', body: formData });
        const datos = await respuesta.json();
        mostrarMensaje(datos.mensaje || datos.error, !respuesta.ok || !datos.ok);
        cargarContactos(inputBusqueda.value);
    } catch (error) {
        mostrarMensaje('Error importando CSV', true);
    }
}

btnExportarCsv?.addEventListener('click', () => exportarCSV(false));
btnImportarCsv?.addEventListener('click', () => inputCsv.click());
btnEliminarTodos?.addEventListener('click', eliminarTodosContactos);
inputCsv?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) importarCSV(e.target.files[0]);
    e.target.value = '';
});

// --- LÓGICA CREACIÓN NUEVO USUARIO (SÓLO ADMIN) ---
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

    if (!email.includes('@') || !password) {
        mostrarMensaje('Rellena nombre, correo válido y contraseña', true);
        return;
    }

    try {
        const res = await fetchApi('/api/users', {
            method: 'POST',
            body: JSON.stringify({ email, password, roles: ['ROLE_ELEVATED'] })
        });
        const data = await res.json();

        if (res.ok && data.ok) {
            mostrarMensaje('Usuario creado exitosamente');
            panelNuevoUsuario.classList.add('oculto');
        } else {
            mostrarMensaje(data.error || 'Error al crear usuario', true);
        }
    } catch (e) {
        mostrarMensaje('Error de conexión al crear usuario', true);
    }
});

const inputsUsuario = [
    document.getElementById('nuevoUsuarioNombre'),
    document.getElementById('nuevoUsuarioEmail'),
    document.getElementById('nuevoUsuarioPassword'),
    guardarNuevoUsuario, cancelarNuevoUsuario
];

inputsUsuario.forEach((input, index) => {
    input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.tagName === 'INPUT') {
            e.preventDefault();
            guardarNuevoUsuario.click();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelarNuevoUsuario.click();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            inputsUsuario[index + 1]?.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            inputsUsuario[index - 1]?.focus();
        }
    });
});

// INICIO DE LA APLICACIÓN
verificarSesion();
cargarContactos();