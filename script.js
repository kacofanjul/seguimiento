document.addEventListener('DOMContentLoaded', () => {
    const proyectosContainer = document.getElementById('proyectos-container');
    const lastUpdatedSpan = document.getElementById('last-updated');

    // Función para convertir fecha YYYY-MM-DD a objeto Date
    function parseDate(dateString) {
        if (!dateString) return null;
        const parts = dateString.split('-');
        return new Date(parts[0], parts[1] - 1, parts[2]); // Mes es 0-indexado
    }

    // Función para calcular la duración en días (aproximado para el timeline)
    function getDurationInDays(start, end) {
        if (!start || !end) return 1; // Duración mínima si falta alguna fecha
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(1, diffDays); // Mínimo 1 día para visualización
    }

    fetch('proyectos.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            // Añadir fecha de última actualización del archivo JSON
            const lastModified = response.headers.get('Last-Modified');
            if (lastUpdatedSpan && lastModified) {
                lastUpdatedSpan.textContent = new Date(lastModified).toLocaleString();
            } else if (lastUpdatedSpan) {
                lastUpdatedSpan.textContent = new Date().toLocaleString() + " (JSON local)";
            }
            return response.json();
        })
        .then(proyectos => {
            if (proyectos.length === 0) {
                proyectosContainer.innerHTML = '<p>No hay proyectos para mostrar.</p>';
                return;
            }
            proyectos.forEach(proyecto => {
                const proyectoCard = document.createElement('div');
                proyectoCard.classList.add('proyecto-card');

                let html = `<h2>${proyecto.nombre}</h2>`;
                if (proyecto.descripcion) {
                    html += `<p><em>${proyecto.descripcion}</em></p>`;
                }
                html += `<p><strong>Estado General:</strong> ${proyecto.estadoGeneral || 'No definido'}</p>`;
                html += `<p><strong>Responsable:</strong> ${proyecto.responsable || 'N/A'}</p>`;
                html += `<p><strong>Inicio Estimado:</strong> ${proyecto.fechaInicioGeneralEstimada || 'N/A'} - <strong>Fin Estimado:</strong> ${proyecto.fechaFinGeneralEstimada || 'N/A'}</p>`;

                html += '<h3>Etapas:</h3>';

                // Para el timeline
                let proyectoInicioEstimado = null;
                let proyectoFinEstimado = null;

                if (proyecto.etapas && proyecto.etapas.length > 0) {
                    proyecto.etapas.forEach(etapa => {
                        html += `
                            <div class="etapa ${etapa.estado.replace(/\s+/g, '')}">
                                <h3>${etapa.nombre}</h3>
                                <p>Estado: ${etapa.estado}</p>
                                <p>Estimado: ${etapa.fechaInicioEstimada || 'N/A'} - ${etapa.fechaFinEstimada || 'N/A'}</p>
                                ${(etapa.fechaInicioReal || etapa.fechaFinReal) ?
                                    `<p>Real: ${etapa.fechaInicioReal || 'N/A'} - ${etapa.fechaFinReal || 'N/A'}</p>` : ''
                                }
                                ${(typeof etapa.progreso !== 'undefined') ? `<p>Progreso: ${etapa.progreso}%</p>` : ''}
                            </div>
                        `;
                        // Actualizar fechas generales del proyecto para el timeline
                        const etapaInicioEst = parseDate(etapa.fechaInicioEstimada);
                        const etapaFinEst = parseDate(etapa.fechaFinEstimada);
                        if (etapaInicioEst && (!proyectoInicioEstimado || etapaInicioEst < proyectoInicioEstimado)) {
                            proyectoInicioEstimado = etapaInicioEst;
                        }
                        if (etapaFinEst && (!proyectoFinEstimado || etapaFinEst > proyectoFinEstimado)) {
                            proyectoFinEstimado = etapaFinEst;
                        }
                    });

                    // Construir el Timeline simple
                    if (proyectoInicioEstimado && proyectoFinEstimado) {
                        html += `<div class="timeline-container"><h4>Timeline Estimado de Etapas:</h4>`;
                        const duracionTotalProyecto = getDurationInDays(proyectoInicioEstimado, proyectoFinEstimado);

                        html += `<div class="timeline-bar">`;
                        proyecto.etapas.forEach(etapa => {
                            const inicioEst = parseDate(etapa.fechaInicioEstimada);
                            const finEst = parseDate(etapa.fechaFinEstimada);

                            if (inicioEst && finEst && finEst >= inicioEst) {
                                const duracionEtapa = getDurationInDays(inicioEst, finEst);
                                const porcentajeAncho = (duracionEtapa / duracionTotalProyecto) * 100;
                                // El posicionamiento absoluto sería más preciso para solapamientos,
                                // pero para un timeline simple secuencial, flexbox es más fácil.
                                // Este timeline simple asume etapas mayormente secuenciales o que la suma de duraciones
                                // representa bien el total para una barra continua.
                                // Para solapamientos reales, se necesitaría una lógica más compleja o una librería Gantt.
                                html += `
    <div class="timeline-segment timeline-${etapa.estado.replace(/\s+/g, '')}"
         style="width: ${porcentajeAncho}%;"
         title="${etapa.nombre} (${etapa.estado}): ${etapa.fechaInicioEstimada} - ${etapa.fechaFinEstimada}">
        ${etapa.nombre.substring(0, Math.floor(porcentajeAncho/4))} <!-- Ajusta la lógica de substring para que quepa -->
    </div>
`;
                            }
                        });
                        html += `</div></div>`; // Cierre de timeline-bar y timeline-container
                    }


                } else {
                    html += '<p>No hay etapas definidas para este proyecto.</p>';
                }

                proyectoCard.innerHTML = html;
                proyectosContainer.appendChild(proyectoCard);
            });
        })
        .catch(error => {
            console.error('Error al cargar los proyectos:', error);
            proyectosContainer.innerHTML = `<p style="color: red;">Error al cargar los datos de proyectos. Revisa la consola para más detalles.</p>`;
        });
});
