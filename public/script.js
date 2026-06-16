// Referencias principales del DOM
const inputBusqueda = document.getElementById('busqueda');
const resultados = document.getElementById('resultados');
const estado = document.getElementById('estado');

// Botones principales
const btnExportarPdf = document.getElementById('btnExportarPdf');
const btnImportarCsv = document.getElementById('btnImportarCsv');
const btnExportarCsv = document.getElementById('btnExportarCsv');
const btnEliminarTodos = document.getElementById('btnEliminarTodos');

// Input oculto CSV
const inputCsv = document.getElementById('inputCsv');

// Nuevo contacto
const btnNuevo = document.getElementById('btnNuevoContacto');
const panelNuevo = document.getElementById('panelNuevo');

const guardarNuevo = document.getElementById('guardarNuevoContacto');
const cancelarNuevo = document.getElementById('cancelarNuevoContacto');

// Inputs formulario superior
const nuevoNombre = document.getElementById('nuevoNombre');
const nuevoDepartamento = document.getElementById('nuevoDepartamento');
const nuevoExtension = document.getElementById('nuevoExtension');
const nuevoEmail = document.getElementById('nuevoEmail');

// Diccionarios para controlar hilos múltiples en paralelo
let contactosActuales = [];
let idEditar = null;
let estadosContactos = {};
let segundosEliminar = {};
let timersEliminar = {};    
let timeoutMensaje = null;

const coloresDepartamento = [
    '#000000', '#1a1a1a', '#2b2b2b', '#3d3d3d', '#4f4f4f',
    '#616161', '#737373', '#858585', '#979797', '#a9a9a9',
    '#bcbcbc', '#d0d0d0', '#e5e5e5', '#f5f5f5'
];

// Carga los colores guardados
const coloresDepartamentos = JSON.parse(localStorage.getItem('coloresDepartamentos')) || {};

// Mensajes de interfaz
function mostrarMensaje(texto, esError = false) {
    if (!estado) return;

    if (timeoutMensaje) {
        clearTimeout(timeoutMensaje);
    }

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

// Restricción extensión formulario superior
nuevoExtension?.addEventListener('input', (e) => {
    if (e.target.value.length > 4) {
        e.target.value = e.target.value.slice(0, 4);
    }
});

// Cargar contactos (Modificado para API Symfony)
async function cargarContactos(q = '') {
    try {
        const respuesta = await fetch('/api/contactos?q=' + encodeURIComponent(q));
        const datos = await respuesta.json();
        contactosActuales = Array.isArray(datos) ? datos : [];
        renderizarContactos(contactosActuales);

        if (!timeoutMensaje) {
            estado.textContent = contactosActuales.length + ' contactos';
        }
    } catch (error) {
        console.error(error);
        mostrarMensaje('Error cargando contactos', true);
    }
}

// Vincula los controladores de navegación por flechas y teclado estructural a cada tarjeta
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
            if (anterior) {
                anterior.focus();
            } else {
                inputBusqueda?.focus();
            }
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            const botones = Array.from(tarjeta.querySelectorAll('button'));
            if (botones.length > 0) {
                e.preventDefault();
                const botonActivo = document.activeElement;
                let idxBoton = botones.indexOf(botonActivo);

                if (idxBoton === -1) {
                    botones[0].focus();
                } else {
                    if (e.key === 'ArrowRight') {
                        idxBoton = (idxBoton + 1) % botones.length;
                    } else {
                        idxBoton = (idxBoton - 1 + botones.length) % botones.length;
                    }
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

// Pintar tarjetas reactivas basándose en el estado individual de cada contacto
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

        // Edición inline
        if (contacto.id === idEditar) {
            tarjeta.innerHTML = `
                <div class="tarjeta_grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;">
                    <div class="campo">
                        <label>Nombre</label>
                        <input type="text" id="editNombre-${contacto.id}" value="${contacto.nombre}" maxlength="50" class="input-inline">
                    </div>
                    <div class="campo">
                        <label>Departamento</label>
                        <input type="text" id="editDepartamento-${contacto.id}" value="${contacto.departamento}" maxlength="50" class="input-inline">
                    </div>
                    <div class="campo">
                        <label>Extensión</label>
                        <input type="number" id="editExtension-${contacto.id}" value="${contacto.extension}" maxlength="15" class="input-inline">
                    </div>
                    <div class="campo">
                        <label>Correo electrónico</label>
                        <input type="email" id="editEmail-${contacto.id}" value="${contacto.email || ''}" maxlength="50" class="input-inline">
                    </div>
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

            // Mapeo completo de teclado responsivo estructural para el formulario inline
            const inputsInline = [
                tarjeta.querySelector(`#editNombre-${contacto.id}`),
                tarjeta.querySelector(`#editDepartamento-${contacto.id}`),
                tarjeta.querySelector(`#editExtension-${contacto.id}`),
                tarjeta.querySelector(`#editEmail-${contacto.id}`),
                btnGuardar,
                btnCancelarInline
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

        // Cuentra atrás 
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

        // Pre-confirmación individual
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

        // Lectura normal
        } else {
            tarjeta.innerHTML = `
                <div class="tarjeta_contenido">
                    <h3>${contacto.nombre}</h3>
                    <p><strong>Departamento:</strong> ${contacto.departamento}</p>
                    <p><strong>Extensión:</strong> ${contacto.extension}</p>
                    <p><strong>Email:</strong> ${contacto.email || '-'}</p>
                </div>
                <div class="tarjeta_acciones-contacto">
                    <button type="button" class="boton boton--secundario btn-editar">Editar</button>
                    <button type="button" class="boton boton--eliminar btn-eliminar">Eliminar</button>
                </div>
            `;

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
            inyectarNavegacionTecladoTarjeta(tarjeta, contacto.id);
        }
        resultados.appendChild(tarjeta);
    });
}

// Guarda los datos directamente (Modificado para API Symfony PUT)
async function guardarContactoInline(id, tarjeta) {
    const nombreVal = tarjeta.querySelector(`#editNombre-${id}`).value.trim();
    const deptoVal = tarjeta.querySelector(`#editDepartamento-${id}`).value.trim();
    const extVal = tarjeta.querySelector(`#editExtension-${id}`).value.trim();
    const emailVal = tarjeta.querySelector(`#editEmail-${id}`).value.trim();

    if (nombreVal === '' || deptoVal === '' || extVal === '') {
        mostrarMensaje('Nombre, departamento y extensión son obligatorios', true);
        return;
    }

    if (emailVal !== '' && !emailVal.includes('@')) {
        mostrarMensaje('Formato de correo inválido', true);
        return;
    }

    const datos = { nombre: nombreVal, departamento: deptoVal, extension: extVal, email: emailVal };

    try {
        const respuesta = await fetch(`/api/contactos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
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
        console.error(error);
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

// Eliminar individual real (Modificado para API Symfony DELETE)
async function ejecutarEliminacionReal(id) {
    try {
        const respuesta = await fetch(`/api/contactos/${id}`, { method: 'DELETE' });
        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.ok) {
            mostrarMensaje(resultado.error || 'Error al eliminar', true);
        } else {
            mostrarMensaje('Contacto eliminado correctamente');
        }
        cargarContactos(inputBusqueda.value);
    } catch (error) {
        console.error(error);
        mostrarMensaje('Error de conexión al eliminar', true);
        cargarContactos(inputBusqueda.value);
    }
}

// Eliminar todos (Modificado API y con el 3er aviso incorporado)
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
            if (!segundoSeguro) {
                cargarContactos(inputBusqueda.value);
                return;
            }

            const tercerSeguro = confirm('ADVERTENCIA FINAL: Acción irreversible.\n¿Borrar TODOS los contactos definitivamente?');
            if (!tercerSeguro) {
                cargarContactos(inputBusqueda.value);
                return;
            }

            let segundos = 5;
            let cancelado = false;

            if (timeoutMensaje) {
                clearTimeout(timeoutMensaje);
                timeoutMensaje = null;
            }

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
                        const respuesta = await fetch('/api/contactos/batch/todos', { method: 'DELETE' });
                        const resultado = await respuesta.json();

                        if (!respuesta.ok || !resultado.ok) {
                            mostrarMensaje(resultado.error || 'Error eliminando', true);
                            return;
                        }

                        await cargarContactos(inputBusqueda.value);
                        mostrarMensaje(`Los ${resultado.cantidad || 0} contactos se han eliminado correctamente`);
                    } catch (error) {
                        console.error(error);
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

// Guardar contacto nuevo (Modificado para API Symfony POST y validaciones)
async function guardarContacto() {
    const emailVal = nuevoEmail.value.trim();
    if (emailVal !== '' && !emailVal.includes('@')) {
        mostrarMensaje('Formato de correo inválido', true);
        return;
    }

    if (!nuevoNombre.value.trim() || !nuevoDepartamento.value.trim() || !nuevoExtension.value.trim()) {
         mostrarMensaje('Faltan campos obligatorios', true);
         return;
    }

    const datos = { 
        nombre: nuevoNombre.value.trim(), 
        departamento: nuevoDepartamento.value.trim(), 
        extension: nuevoExtension.value.trim(), 
        email: emailVal 
    };

    try {
        const respuesta = await fetch('/api/contactos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        console.error(error);
        mostrarMensaje('Error de conexión', true);
    }
}

// Buscador e inyección de salto hacia abajo por teclado
inputBusqueda?.addEventListener('input', () => {
    cargarContactos(inputBusqueda.value);
});
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

// Accesibilidad cabecera
const botonesCabecera = [btnNuevo, btnExportarPdf, btnImportarCsv, btnExportarCsv, btnEliminarTodos];
botonesCabecera.forEach((btn, index) => {
    btn?.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            const siguiente = botonesCabecera[(index + 1) % botonesCabecera.length];
            siguiente?.focus();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const anterior = botonesCabecera[(index - 1 + botonesCabecera.length) % botonesCabecera.length];
            anterior?.focus();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            inputBusqueda?.focus();
        }
    });
});

// Mostrar formulario superior
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

// Cancelar formulario superior
cancelarNuevo?.addEventListener('click', () => {
    panelNuevo.classList.add('oculto');
    limpiarFormulario();
    renderizarContactos(contactosActuales);
    btnNuevo?.focus();
});

guardarNuevo?.addEventListener('click', guardarContacto);

// Navegación por teclado estructural para el formulario superior de creación
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

// Exportar CSV
function exportarCSV(esRespaldo = false) {
    if (!contactosActuales.length) {
        if (!esRespaldo) mostrarMensaje('No hay contactos para exportar.', true);
        return;
    }

    const escaparCSV = (valor) => {
        valor = valor ?? '';
        return `"${String(valor).replace(/"/g, '""').trim()}"`;
    };

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

// Importar CSV (Modificado para API Symfony POST)
async function importarCSV(archivo) {
    const formData = new FormData();
    formData.append('archivo_csv', archivo);
    try {
        const respuesta = await fetch('/api/contactos/importar', { method: 'POST', body: formData });
        const datos = await respuesta.json();
        mostrarMensaje(datos.mensaje || datos.error, !respuesta.ok);
        cargarContactos(inputBusqueda.value);
    } catch (error) {
        console.error(error);
        mostrarMensaje('Error importando CSV', true);
    }
}

btnExportarCsv?.addEventListener('click', exportarCSV);
btnImportarCsv?.addEventListener('click', () => inputCsv.click());
btnEliminarTodos?.addEventListener('click', eliminarTodosContactos);
inputCsv?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) importarCSV(e.target.files[0]);
    e.target.value = '';
});

// Exportar PDF
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

// Inicio
cargarContactos();


// --- NUEVA LÓGICA DE USUARIOS ---
const panelNuevoUsuario = document.getElementById('panelNuevoUsuario');
const btnNuevoUsuario = document.getElementById('btnNuevoUsuario');
const guardarNuevoUsuario = document.getElementById('guardarNuevoUsuario');
const cancelarNuevoUsuario = document.getElementById('cancelarNuevoUsuario');

btnNuevoUsuario?.addEventListener('click', () => {
    panelNuevoUsuario.classList.remove('oculto');
    document.getElementById('nuevoUsuarioNombre').value = '';
    document.getElementById('nuevoUsuarioEmail').value = '';
    document.getElementById('nuevoUsuarioPassword').value = '';
    document.getElementById('nuevoUsuarioNombre').focus();
});

cancelarNuevoUsuario?.addEventListener('click', () => {
    panelNuevoUsuario.classList.add('oculto');
});

guardarNuevoUsuario?.addEventListener('click', async () => {
    const nombre = document.getElementById('nuevoUsuarioNombre').value.trim();
    const email = document.getElementById('nuevoUsuarioEmail').value.trim();
    const password = document.getElementById('nuevoUsuarioPassword').value.trim();

    if (!email.includes('@') || !password || !nombre) {
        mostrarMensaje('Rellena todos los campos correctamente', true);
        return;
    }

    try {
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, roles: ['ROLE_ELEVATED'] })
        });
        const data = await res.json();

        if (!res.ok || !data.ok) {
            mostrarMensaje(data.error || 'Error al crear usuario', true);
        } else {
            mostrarMensaje('Usuario creado exitosamente');
            panelNuevoUsuario.classList.add('oculto');
        }
    } catch (error) {
        console.error(error);
        mostrarMensaje('Error de conexión al crear usuario', true);
    }
});

// Soporte de navegación por teclado para la creación de usuarios
const inputsUsuario = [
    document.getElementById('nuevoUsuarioNombre'),
    document.getElementById('nuevoUsuarioEmail'),
    document.getElementById('nuevoUsuarioPassword'),
    guardarNuevoUsuario,
    cancelarNuevoUsuario
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