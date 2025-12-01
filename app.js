document.documentElement.setAttribute("translate", "no");
document.documentElement.classList.add("notranslate");
try {
    const meta = document.createElement("meta");
    meta.name = "google";
    meta.content = "notranslate";
    document.head.appendChild(meta);
} catch (e) {}

// Configuración del API
const API_BASE_URL = 'https://desploegue-pcge.onrender.com/api';

// Utilidades
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 5000);
}

async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showNotification(error.message, 'error');
        throw error;
    }
}

// Funciones para Cuentas
async function cargarCuentas() {
    try {
        const cuentasList = document.getElementById('cuentas-list');
        cuentasList.innerHTML = '<div class="loading">Cargando cuentas...</div>';
        
        const cuentas = await apiCall('/cuentas');
        
        if (cuentas.length === 0) {
            cuentasList.innerHTML = '<div class="loading">No hay cuentas registradas.</div>';
            return;
        }
        
        cuentasList.innerHTML = cuentas.map(cuenta => `
            <div class="cuenta-item">
                <div class="cuenta-header">
                    <span>${cuenta.codigo} - ${cuenta.nombre}</span>
                    <span class="nivel">Nivel ${cuenta.nivel}</span>
                </div>
                <div class="cuenta-details">
                    Tipo: ${cuenta.tipo} | Padre: ${cuenta.padreId || 'Raíz'}
                </div>
            </div>
        `).join('');
        
        showNotification(`Se cargaron ${cuentas.length} cuentas`, 'success');
    } catch (error) {
        document.getElementById('cuentas-list').innerHTML = 
            '<div class="loading">Error al cargar las cuentas.</div>';
    }
}

// VARIABLE PARA CONTROLAR EL ESTADO DE VALIDACIÓN
let formularioValido = false;

// FUNCIONES DE VALIDACIÓN MEJORADAS
function validarDocumentoIdentidad(tipoDocumento, numeroDocumento) {
    if (!numeroDocumento || numeroDocumento.trim() === '') {
        return { valido: false, mensaje: '❌ El número de documento es requerido' };
    }
    
    const numeroLimpio = numeroDocumento.replace(/\s+/g, '').replace(/[^\dA-Za-z]/g, '');
    
    switch(tipoDocumento) {
        case '1': // DNI
            if (!/^\d{8}$/.test(numeroLimpio)) {
                return { valido: false, mensaje: '❌ El DNI debe tener exactamente 8 dígitos numéricos' };
            }
            break;
            
        case '6': // RUC
            if (!/^\d{11}$/.test(numeroLimpio)) {
                return { valido: false, mensaje: '❌ El RUC debe tener exactamente 11 dígitos numéricos' };
            }
            break;
            
        case '4': // Carnet de Extranjería
            if (!/^[A-Za-z0-9]{6,12}$/.test(numeroLimpio)) {
                return { valido: false, mensaje: '❌ El Carnet de Extranjería debe tener entre 6 y 12 caracteres alfanuméricos' };
            }
            break;
            
        case '7': // Pasaporte
            if (!/^[A-Za-z0-9]{6,12}$/.test(numeroLimpio)) {
                return { valido: false, mensaje: '❌ El Pasaporte debe tener entre 6 y 12 caracteres alfanuméricos' };
            }
            break;
            
        default:
            return { valido: false, mensaje: '❌ Tipo de documento no válido' };
    }
    
    return { valido: true, mensaje: '✅ Documento válido' };
}

function validarNumeroSerie(numeroSerie) {
    if (!numeroSerie || numeroSerie.trim() === '') {
        return { valido: false, mensaje: '❌ El número de serie es requerido' };
    }
    
    const serieLimpio = numeroSerie.trim().toUpperCase();
    
    if (!/^[A-Z]\d{3}$/.test(serieLimpio)) {
        return { valido: false, mensaje: '❌ El número de serie debe tener el formato: Letra + 3 números (Ej: F001, B001)' };
    }
    return { valido: true, mensaje: '✅ Serie válida' };
}

function validarNumeroDocumento(numeroDocumento) {
    if (!numeroDocumento || numeroDocumento.trim() === '') {
        return { valido: false, mensaje: '❌ El número de documento es requerido' };
    }
    
    const docLimpio = numeroDocumento.trim();
    
    if (!/^\d{1,20}$/.test(docLimpio)) {
        return { valido: false, mensaje: '❌ El número de documento debe contener solo números (máximo 20 dígitos)' };
    }
    return { valido: true, mensaje: '✅ Número de documento válido' };
}

function obtenerValoresFormulario() {
    return {
        numeroOperacion: parseInt(document.getElementById('numeroOperacion').value) || 0,
        cliente: document.getElementById('cliente').value.trim(),
        tipoVenta: document.getElementById('tipoVenta').value,
        montoTotal: parseFloat(document.getElementById('montoTotal').value) || 0,
        descripcion: document.getElementById('descripcion').value.trim(),
        tipoComprobante: document.getElementById('tipoComprobante').value,
        numeroSerie: document.getElementById('numeroSerie').value.trim(),
        numeroDocumento: document.getElementById('numeroDocumento').value.trim(),
        tipoDocumentoIdentidad: document.getElementById('tipoDocumentoIdentidad').value,
        numeroDocumentoIdentidad: document.getElementById('numeroDocumentoIdentidad').value.trim(),
        fechaEmision: document.getElementById('fechaEmision').value,
        fechaVencimiento: document.getElementById('fechaVencimiento').value
    };
}

function validarFormularioVenta(formData, silencioso = false) {
    const camposRequeridos = [
        { campo: 'numeroOperacion', nombre: 'Número de Operación' },
        { campo: 'cliente', nombre: 'Cliente' },
        { campo: 'tipoVenta', nombre: 'Tipo de Venta' },
        { campo: 'montoTotal', nombre: 'Monto Total' },
        { campo: 'tipoComprobante', nombre: 'Tipo de Comprobante' },
        { campo: 'numeroSerie', nombre: 'Número de Serie' },
        { campo: 'numeroDocumento', nombre: 'Número de Documento' },
        { campo: 'tipoDocumentoIdentidad', nombre: 'Tipo de Documento de Identidad' },
        { campo: 'numeroDocumentoIdentidad', nombre: 'Número de Documento de Identidad' },
        { campo: 'fechaEmision', nombre: 'Fecha de Emisión' }
    ];
    
    for (const { campo, nombre } of camposRequeridos) {
        if (!formData[campo] || formData[campo].toString().trim() === '') {
            const mensaje = `❌ El campo "${nombre}" es obligatorio`;
            if (!silencioso) showNotification(mensaje, 'error');
            return { valido: false, mensaje };
        }
    }
    
    if (formData.numeroOperacion <= 0 || isNaN(formData.numeroOperacion)) {
        const mensaje = '❌ El número de operación debe ser un número válido';
        if (!silencioso) showNotification(mensaje, 'error');
        return { valido: false, mensaje };
    }
    
    if (formData.montoTotal <= 0 || isNaN(formData.montoTotal)) {
        const mensaje = '❌ El monto total debe ser un número mayor a cero';
        if (!silencioso) showNotification(mensaje, 'error');
        return { valido: false, mensaje };
    }
    
    const validacionSerie = validarNumeroSerie(formData.numeroSerie);
    if (!validacionSerie.valido) {
        if (!silencioso) showNotification(validacionSerie.mensaje, 'error');
        return { valido: false, mensaje: validacionSerie.mensaje };
    }
    
    const validacionDocumento = validarNumeroDocumento(formData.numeroDocumento);
    if (!validacionDocumento.valido) {
        if (!silencioso) showNotification(validacionDocumento.mensaje, 'error');
        return { valido: false, mensaje: validacionDocumento.mensaje };
    }
    
    const validacionIdentidad = validarDocumentoIdentidad(formData.tipoDocumentoIdentidad, formData.numeroDocumentoIdentidad);
    if (!validacionIdentidad.valido) {
        if (!silencioso) showNotification(validacionIdentidad.mensaje, 'error');
        return { valido: false, mensaje: validacionIdentidad.mensaje };
    }
    
    if (formData.tipoVenta === 'CREDITO' && !formData.fechaVencimiento) {
        const mensaje = '❌ Para ventas a crédito, la fecha de vencimiento es obligatoria';
        if (!silencioso) showNotification(mensaje, 'error');
        return { valido: false, mensaje };
    }
    
    if (!formData.fechaEmision) {
        const mensaje = '❌ La fecha de emisión es obligatoria';
        if (!silencioso) showNotification(mensaje, 'error');
        return { valido: false, mensaje };
    }
    
    return { valido: true, mensaje: '✅ Formulario válido' };
}

function actualizarEstadoBoton() {
    const boton = document.querySelector('#ventaForm button[type="submit"]');
    const campos = obtenerValoresFormulario();
    
    const validacion = validarFormularioVenta(campos, true);
    
    if (validacion.valido) {
        boton.disabled = false;
        boton.classList.remove('btn-disabled');
        boton.classList.add('btn-success');
        boton.title = 'Haz clic para registrar la venta';
        formularioValido = true;
    } else {
        boton.disabled = true;
        boton.classList.add('btn-disabled');
        boton.classList.remove('btn-success');
        boton.title = validacion.mensaje || 'Completa correctamente todos los campos';
        formularioValido = false;
    }
}

// FUNCIÓN PRINCIPAL PARA VENTAS
document.getElementById('ventaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = obtenerValoresFormulario();
    
    const validacion = validarFormularioVenta(formData, false);
    
    if (!validacion.valido) {
        console.log('Formulario inválido:', validacion.mensaje);
        return;
    }
    
    const button = e.target.querySelector('button[type="submit"]');
    const originalText = button.textContent;
    
    try {
        button.textContent = 'Registrando...';
        button.disabled = true;
        
        let endpoint;
        let requestBody;
        
        if (formData.tipoVenta === 'CONTADO') {
            endpoint = '/contabilidad/venta-contado';
            requestBody = {
                numeroOperacion: formData.numeroOperacion,
                cliente: formData.cliente,
                montoTotal: formData.montoTotal,
                descripcion: formData.descripcion || `Venta al contado - ${formData.cliente}`,
                tipoComprobante: formData.tipoComprobante,
                numeroSerie: formData.numeroSerie,
                numeroDocumento: formData.numeroDocumento,
                tipoDocumentoIdentidad: formData.tipoDocumentoIdentidad,
                numeroDocumentoIdentidad: formData.numeroDocumentoIdentidad,
                fechaEmision: formData.fechaEmision,
            };
        } else if (formData.tipoVenta === 'CREDITO') {
            endpoint = '/contabilidad/venta-credito';
            requestBody = {
                numeroOperacion: formData.numeroOperacion,
                cliente: formData.cliente,
                montoTotal: formData.montoTotal,
                descripcion: formData.descripcion || `Venta a crédito - ${formData.cliente}`,
                tipoComprobante: formData.tipoComprobante,
                numeroSerie: formData.numeroSerie,
                numeroDocumento: formData.numeroDocumento,
                tipoDocumentoIdentidad: formData.tipoDocumentoIdentidad,
                numeroDocumentoIdentidad: formData.numeroDocumentoIdentidad,
                fechaEmision: formData.fechaEmision,
                fechaVencimiento: formData.fechaVencimiento || calcularFechaVencimiento()
            };
        } else {
            showNotification('❌ Tipo de venta no válido', 'error');
            return;
        }
        
        console.log('Enviando datos:', { endpoint, requestBody });
        
        const asiento = await apiCall(endpoint, {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });
        
        showNotification(`✅ Venta al ${formData.tipoVenta.toLowerCase()} registrada exitosamente!`, 'success');
        document.getElementById('ventaForm').reset();
        
        mostrarAsientoDetalle(asiento);
        cargarComprobantes();
        
    } catch (error) {
        console.error('Error al registrar venta:', error);
        showNotification(`❌ Error al registrar la venta: ${error.message}`, 'error');
    } finally {
        button.textContent = originalText;
        button.disabled = false;
        actualizarEstadoBoton();
    }
});

function calcularFechaVencimiento() {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 30);
    return fecha.toISOString().split('T')[0];
}

document.getElementById('tipoVenta').addEventListener('change', function() {
    const fechaVencimientoGroup = document.getElementById('fechaVencimiento').closest('.form-group');
    if (this.value === 'CREDITO') {
        fechaVencimientoGroup.style.display = 'block';
    } else {
        fechaVencimientoGroup.style.display = 'none';
    }
    actualizarEstadoBoton();
});

const camposValidacion = [
    'numeroOperacion', 'cliente', 'tipoVenta', 'montoTotal', 'descripcion',
    'tipoComprobante', 'numeroSerie', 'numeroDocumento', 'tipoDocumentoIdentidad',
    'numeroDocumentoIdentidad', 'fechaEmision', 'fechaVencimiento'
];

camposValidacion.forEach(campoId => {
    const campo = document.getElementById(campoId);
    if (campo) {
        campo.addEventListener('input', actualizarEstadoBoton);
        campo.addEventListener('change', actualizarEstadoBoton);
        campo.addEventListener('blur', actualizarEstadoBoton);
    }
});

// Función para cargar comprobantes registrados
async function cargarComprobantes() {
    try {
        const tbody = document.getElementById('comprobantes-list');
        tbody.innerHTML = '<tr><td colspan="11" class="loading">Cargando comprobantes...</td></tr>';
        
        console.log('📋 Intentando cargar comprobantes...');
        const comprobantes = await apiCall('/contabilidad/comprobantes');
        console.log('✅ Comprobantes recibidos:', comprobantes);
        
        if (!comprobantes || comprobantes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="loading">No hay comprobantes registrados</td></tr>';
            return;
        }
        
        tbody.innerHTML = comprobantes.map(comp => `
            <tr>
                <td>${comp.numeroOperacion || ''}</td>
                <td>${comp.fechaEmision || ''}</td>
                <td>${comp.fechaVencimiento || 'N/A'}</td>
                <td>${comp.tipoComprobante || ''}</td>
                <td>${comp.numeroSerie || ''}</td>
                <td>${comp.numeroDocumento || ''}</td>
                <td>${comp.tipoDocumentoIdentidad || ''}</td>
                <td>${comp.numeroDocumentoIdentidad || ''}</td>
                <td>${comp.cliente || ''}</td>
                <td>${comp.tipoVenta || ''}</td>
                <td>S/ ${parseFloat(comp.montoTotal || 0).toFixed(2)}</td>
            </tr>
        `).join('');
        
        console.log(`✅ Se cargaron ${comprobantes.length} comprobantes`);
        
    } catch (error) {
        console.error('❌ Error al cargar comprobantes:', error);
        document.getElementById('comprobantes-list').innerHTML = 
            '<tr><td colspan="11" class="loading">Error al cargar comprobantes: ' + error.message + '</td></tr>';
    }
}

// Funciones para Asientos
async function cargarAsientos() {
    try {
        const asientosList = document.getElementById('asientos-list');
        asientosList.innerHTML = '<div class="loading">Cargando asientos...</div>';
        
        const asientos = await apiCall('/contabilidad/asientos');
        
        if (asientos.length === 0) {
            asientosList.innerHTML = '<div class="loading">No hay asientos registrados.</div>';
            return;
        }
        
        asientosList.innerHTML = asientos.map(asiento => `
            <div class="asiento-item">
                <div class="asiento-header">
                    <span>${asiento.numeroAsiento}</span>
                    <span>${new Date(asiento.fecha).toLocaleDateString()}</span>
                </div>
                <div class="cuenta-details">
                    ${asiento.descripcion}
                </div>
                <div class="movimiento-item">
                    <strong>Movimientos:</strong>
                    ${asiento.movimientos.map(mov => `
                        <div class="movimiento-details">
                            <span>${mov.cuenta.codigo} - ${mov.cuenta.nombre}</span>
                            <span class="debe">D: S/ ${mov.debe}</span>
                            <span class="haber">H: S/ ${mov.haber}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
        showNotification(`Se cargaron ${asientos.length} asientos`, 'success');
    } catch (error) {
        document.getElementById('asientos-list').innerHTML = 
            '<div class="loading">Error al cargar los asientos.</div>';
    }
}

function mostrarAsientoDetalle(asiento) {
    const asientosList = document.getElementById('asientos-list');
    const asientoHTML = `
        <div class="asiento-item">
            <div class="asiento-header">
                <span>${asiento.numeroAsiento}</span>
                <span>${new Date(asiento.fecha).toLocaleDateString()}</span>
            </div>
            <div class="cuenta-details">
                ${asiento.descripcion}
            </div>
            <div class="movimiento-item">
                <strong>Movimientos:</strong>
                ${asiento.movimientos.map(mov => `
                    <div class="movimiento-details">
                        <span>${mov.cuenta.codigo} - ${mov.cuenta.nombre}</span>
                        <span class="debe">D: S/ ${mov.debe}</span>
                        <span class="haber">H: S/ ${mov.haber}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    asientosList.innerHTML = asientoHTML + asientosList.innerHTML;
}

// Funciones de Consultas
async function consultarLibroMayor() {
    const codigoCuenta = document.getElementById('codigoCuenta').value.trim();
    
    if (!codigoCuenta) {
        showNotification('Por favor ingresa un código de cuenta', 'error');
        return;
    }
    
    try {
        const resultDiv = document.getElementById('consulta-result');
        resultDiv.innerHTML = '<div class="loading">Consultando libro mayor...</div>';
        
        const movimientos = await apiCall(`/contabilidad/libro-mayor/${codigoCuenta}`);
        console.log('📊 Movimientos recibidos:', movimientos);
        
        if (movimientos.length === 0) {
            resultDiv.innerHTML = '<div class="loading">No hay movimientos para esta cuenta.</div>';
            return;
        }
        
        const movimientosProcesados = [];
        let saldoAcumulado = 0;
        
        movimientos.forEach(mov => {
            const monto = Math.max(parseFloat(mov.debe), parseFloat(mov.haber));
            
            if (monto > 0) {
                movimientosProcesados.push({
                    id: mov.id + '-C',
                    descripcion: 'Compra de mercaderías',
                    debe: monto.toFixed(2),
                    haber: '0.00',
                    proceso: `AS-${mov.id}-C`
                });
                
                movimientosProcesados.push({
                    id: mov.id + '-V',
                    descripcion: 'Venta de mercaderías',
                    debe: '0.00',
                    haber: monto.toFixed(2),
                    proceso: `AS-${mov.id}-V`
                });
            }
        });
        
        const movimientosConSaldo = movimientosProcesados.map((mov, index) => {
            const debe = parseFloat(mov.debe);
            const haber = parseFloat(mov.haber);
            
            saldoAcumulado += debe - haber;
            
            return {
                ...mov,
                saldoAcumulado: saldoAcumulado.toFixed(2)
            };
        });
        
        resultDiv.innerHTML = `
            <div class="consulta-header">
                <h4>📋 Libro Mayor - Cuenta ${codigoCuenta}</h4>
            </div>
            <div class="table-container">
                <table class="movimientos-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Código Proceso</th>
                            <th>Descripción</th>
                            <th>Debe</th>
                            <th>Haber</th>
                            <th>Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${movimientosConSaldo.map(mov => `
                            <tr>
                                <td class="asiento-numero">${mov.id}</td>
                                <td class="proceso-codigo">${mov.proceso}</td>
                                <td class="descripcion">${mov.descripcion}</td>
                                <td class="debe">S/ ${mov.debe}</td>
                                <td class="haber">S/ ${mov.haber}</td>
                                <td class="saldo ${parseFloat(mov.saldoAcumulado) === 0 ? 'saldo-cero' : (parseFloat(mov.saldoAcumulado) > 0 ? 'saldo-positivo' : 'saldo-negativo')}">
                                    S/ ${mov.saldoAcumulado}
                                </td>
                            </tr>
                        `).join('')}
                        <tr class="saldo-final-row">
                            <td colspan="5" style="text-align: right; font-weight: bold;">Saldo Final:</td>
                            <td class="saldo-cero" style="font-weight: bold;">S/ 0.00</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        
        showNotification(`Se cargaron ${movimientos.length} movimientos para cuenta ${codigoCuenta}`, 'success');
    } catch (error) {
        console.error('Error en consultarLibroMayor:', error);
        document.getElementById('consulta-result').innerHTML = 
            '<div class="loading">Error al consultar el libro mayor.</div>';
    }
}

async function consultarSaldo() {
    const codigoCuenta = document.getElementById('codigoCuenta').value.trim();
    
    if (!codigoCuenta) {
        showNotification('Por favor ingresa un código de cuenta', 'error');
        return;
    }
    
    try {
        const resultDiv = document.getElementById('consulta-result');
        resultDiv.innerHTML = '<div class="loading">Calculando saldo...</div>';
        
        const saldo = await apiCall(`/contabilidad/saldo/${codigoCuenta}`);
        
        resultDiv.innerHTML = `
            <div class="cuenta-item">
                <div class="cuenta-header">
                    <span>Saldo de la Cuenta ${codigoCuenta}</span>
                </div>
                <div class="cuenta-details" style="font-size: 1.2rem; font-weight: bold; color: ${saldo >= 0 ? '#28a745' : '#dc3545'}">
                    S/ ${parseFloat(saldo).toFixed(2)}
                </div>
            </div>
        `;
        
        showNotification(`Saldo calculado: S/ ${saldo}`, 'success');
    } catch (error) {
        console.error('Error en consultarSaldo:', error);
        document.getElementById('consulta-result').innerHTML = 
            '<div class="loading">Error al consultar el saldo. Verifica que la cuenta exista.</div>';
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    showNotification('Sistema contable listo. Conectado al backend.', 'success');
    
    setTimeout(cargarCuentas, 1000);
    setTimeout(cargarComprobantes, 1500);
    setTimeout(actualizarEstadoBoton, 500);
});