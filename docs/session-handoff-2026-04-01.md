# Traspaso de sesion

Fecha: `2026-04-01`

## Resumen corto

En esta sesion Atlas de Luz se consolidO como un producto con dos vistas principales:

- `cielo`: composicion visual viva
- `diario`: lectura y edicion tranquila de manifestaciones

Tambien se reforzo la idea de claridad visual alta, con sensibilidad a perfiles con TDAH.

## Decisiones de producto ya tomadas

- La unidad principal de archivo es el `cielo`, no una categoria impuesta.
- Cada estrella guarda `titulo + nota`.
- Las constelaciones son `manuales`.
- El cielo debe tener capacidad limitada.
- Debe existir ayuda integrada que explique uso, almacenamiento local y backups.
- Debe existir exportacion/importacion en `.json`.
- Debe existir un `modo diario` a pantalla completa.
- La UI debe usar color para jerarquizar mejor acciones, estados y paneles.
- Las tabs de cielos pueden y deben acercarse a un lenguaje de `archivador`.
- Debe existir borrado de `cielos`, `estrellas` y `constelaciones`, siempre con confirmacion previa.
- Las confirmaciones y dialogos deben ser `propios de la app`, no ventanas nativas del navegador.

## Lo implementado en codigo durante la sesion

Estado general:

- refactor del modelo de datos a `title + note`
- persistencia en `localStorage`
- exportacion/importacion JSON
- ayuda integrada
- ritual de nacimiento sincronizado
- estrellas arrastrables
- constelaciones con lineas rectas
- base del modo diario
- paleta mas rica en interfaz
- botones con simbolos descriptivos
- tabs de cielos con direccion mas visual

Archivos mas tocados:

- `src/App.tsx`
- `src/styles/app.css`

Verificacion:

- `npm run build` pasa correctamente al cierre de la sesion

## Problemas detectados y tratados

### 1. Jerarquia visual insuficiente

Problema:

- muchas cajas competian con peso parecido
- no quedaba claro donde mirar primero

Respuesta:

- se decidio reforzar el cielo como foco principal
- se pidio usar color para jerarquizar
- se decidio trabajar con un unico panel lateral dominante segun el estado

Estado:

- `parcialmente resuelto`
- la paleta y algunos pesos se han mejorado, pero necesita otra pasada visual viendo la app en navegador

### 2. Hover de estrellas desplazaba el elemento

Problema:

- al pasar el raton por encima de la estrella se movia

Respuesta:

- se elimino el `scale` en hover desde Motion
- el feedback de hover paso a brillo visual en CSS

Estado:

- `resuelto en codigo`
- conviene validar visualmente en navegador

### 3. Drag vs clic ambiguos

Problema:

- el drag y el clic no estaban suficientemente separados
- eso podia afectar seleccion y edicion

Respuesta:

- se anadio un umbral de movimiento antes de considerar que realmente se esta arrastrando
- si no se supera el umbral, el gesto se interpreta como clic

Estado:

- `parcialmente resuelto`
- conviene probar mucho en navegador para confirmar sensacion fina

### 4. Edicion de estrella poco fiable

Problema:

- la usuaria reporto que la edicion no estaba funcionando bien

Respuesta:

- se mantuvo el modelo lectura primero y edicion explicita despues
- se ajusto la separacion clic/drag

Estado:

- `pendiente de validacion visual real`
- posible siguiente ajuste: explicitar aun mas el panel activo y revisar focus/seleccion

### 5. Cielos demasiado parecidos

Problema:

- las atmosferas variaban poco

Respuesta:

- se diferenciaron variables de tema, posiciones y colores
- se anadio idea de enriquecer con mas vida: particulas, estrella fugaz, etc.

Estado:

- `parcialmente resuelto`
- visualmente puede mejorarse bastante mas

### 6. Necesidad de modo diario

Problema:

- el cielo no es la mejor superficie para leer y editar con calma

Respuesta:

- se acordo crear una segunda vista: `modo diario`
- debe verse como libreta/bloc/cuaderno bonito, no como panel administrativo

Estado:

- `base implementada`
- necesita mas direccion artistica y mejor maquetacion final

## Pendientes principales para la siguiente sesion

Orden recomendado:

1. Validar en navegador la sensacion real de `clic`, `drag`, `seleccion` y `edicion`.
2. Terminar de pulir la jerarquia visual del layout para que el foco sea obvio de un vistazo.
3. Mejorar el `modo diario` hasta que se sienta realmente como cuaderno de manifestaciones.
4. Hacer las tabs de cielos mas bonitas y claramente tipo archivador.
5. Refinar constelaciones existentes:
   - verlas mejor
   - potencialmente renombrarlas o borrarlas
6. Mejorar mas las atmosferas de los cielos:
   - composicion
   - color
   - vida ambiental
7. Revisar colocacion de textos para reducir colisiones.
8. Sustituir `prompt/confirm` nativos por overlays propios bonitos.
9. Implementar borrado de cielos, estrellas y constelaciones con confirmacion propia.

## Ideas visuales pendientes ya habladas

- diario tipo scrapbook suave o bloc poetico
- tabs de cielos tipo archivador
- interfaz dark pero con acentos rosa, violeta, menta, dorado y celeste
- botones con simbolos/emojis descriptivos
- mas vida en los cielos sin convertirlos en un screensaver
- modales propios, poeticos y claros para confirmar acciones sensibles

## Riesgos activos

- que la interfaz siga sintiendose igualada en jerarquia aunque el codigo ya haya mejorado
- que el diario se vea aun demasiado "app" y poco "cuaderno"
- que el drag siga generando confusion si el umbral no se siente natural
- que el panel lateral siga cargado si no se simplifica mas por estado

## Siguiente objetivo recomendado

No anadir nuevas funciones grandes antes de hacer una pasada fuerte de:

- claridad visual
- estados de foco
- refinado de diario
- validacion manual del drag y la edicion
