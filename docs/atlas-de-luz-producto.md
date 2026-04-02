# Atlas de Luz

## Concepto

Atlas de Luz es un diario de manifestacion con dos vistas principales:

- `cielo`: la composicion viva y visual
- `diario`: la lectura y edicion tranquila de las entradas

La persona no clasifica sus deseos con categorias impuestas por la app. Crea sus propios `cielos`, les pone nombre y decide que vive en cada uno.

## Promesa

Convierte tus intenciones en estrellas y ordenalas dentro de tus propios cielos.

## Emocion buscada

- Poesia
- Ternura
- Calma
- Sensacion de archivo personal vivo
- AutorIa

## Identidad de la experiencia

- El cielo es el archivo principal.
- El diario es la vista de lectura profunda.
- La estrella es la unidad emocional.
- La constelacion es una composicion elegida por la persona.
- La interfaz acompana al cielo; no lo invade.

## Loop principal

1. La persona crea o abre un cielo.
2. Escribe una estrella con `titulo corto + nota`.
3. El polvo estelar viaja hacia el punto donde nacera la estrella.
4. La estrella aparece al final del ritual.
5. La persona puede moverla, abrirla en modo lectura, editarla o dejarla titilar en su sitio.
6. Cuando quiere, une varias estrellas para formar una constelacion.
7. Si quiere leer con calma, abre el diario y ve sus entradas ordenadas por fecha.
8. Vuelve a sus cielos como archivo vivo de sus manifestaciones.

## Por que funciona

- Tiene ritual.
- Tiene memoria.
- Tiene coleccion.
- Tiene autoria real.
- El orden nace de la persona, no del sistema.
- Permite dos formas de relacionarse con lo mismo: cielo visual y diario escrito.

## Lo que no debe ser

- No debe sentirse agresiva.
- No debe parecer una app cientifica de astronomia.
- No debe tener una landing enorme que robe espacio al cielo.
- No debe imponer categorias emocionales cerradas.
- No debe saturar el cielo con demasiadas estrellas o demasiado texto.
- No debe esconder acciones importantes en flujos ambiguos o con demasiados modos simultaneos.

## Usuario ideal

Persona que disfruta experiencias cute, poeticas o rituales ligeros. Le atraen los diarios visuales, el bienestar suave, la simbologia y las interfaces bonitas con significado.

Tambien debe poder usarse con comodidad por personas que necesitan foco visual claro, pasos evidentes y baja ambiguedad de interfaz, incluyendo perfiles con TDAH.

## Version 1

### Objetivo

Validar que un cielo personal editable, vivo y visualmente bonito tiene valor por si mismo y que el diario complementa esa experiencia sin competir con ella.

### Funcionalidades

- Crear y nombrar cielos.
- Cambiar entre cielos.
- Escribir una estrella con `titulo + nota`.
- Ver un ritual de nacimiento sincronizado.
- Crear una estrella archivada en el cielo activo.
- Recolocar estrellas dentro del cielo.
- Abrir una estrella en modo lectura antes de editarla.
- Editar el titulo, la nota, el color y la forma de una estrella.
- Abrir un `modo diario` a pantalla completa para leer entradas por fecha.
- Elegir si los textos visibles del cielo se muestran o se ocultan.
- Crear constelaciones manuales uniendo estrellas.
- Guardar datos localmente.
- Explicar almacenamiento y flujos desde una ayuda integrada.
- Exportar e importar backups en `.json`.
- Permitir borrar cielos, estrellas y constelaciones con confirmacion previa propia.

### Lo que se deja para despues

- Compartir cielos
- Sincronizacion en nube
- Plantillas de atmosferas
- Sonido reactivo avanzado
- Exportacion de imagen del cielo
- Social o comunidad

## Sistema de cielos

La unidad de archivo no es un sector automatico ni una categoria sugerida. Es un `cielo`.

Cada cielo debe tener:

- nombre
- ambiente visual
- capacidad limitada
- estrellas propias
- constelaciones propias
- acceso a su propio diario de entradas

## Sistema de diario

El diario no sustituye al cielo. Es la segunda vista principal del mismo contenido.

Debe ofrecer:

- lista de entradas por fecha
- mini identificador visual de la estrella
- lectura centrada en `titulo + nota`
- acceso claro a editar
- sensacion de cuaderno o bloc personal

## Capacidad

El cielo no sera infinito real.

Se recomienda para v1:

- cielo pequeno: `12` estrellas
- cielo medio: `16` estrellas
- cielo amplio: `18` estrellas

La capacidad debe proteger la respiracion visual del cielo y evitar solapes.

## Constelaciones

Las constelaciones no deben generarse solas.

La regla recomendada es:

- la persona entra en modo constelacion
- selecciona varias estrellas
- el sistema las une con lineas rectas entre sus centros
- la persona puede nombrar esa constelacion

## Archivo y privacidad

No es obligatorio mostrar siempre el texto completo de cada estrella.

Cada estrella puede guardar:

- `id`
- `createdAt`
- `title`
- `note`
- `showTitle`
- `color`
- `size`
- `shape`
- `skyId`
- `x`
- `y`

Los datos viven por defecto en el navegador de la persona. La app debe dejar esto claro y ofrecer exportacion/importacion sencilla para backups.

Las acciones sensibles no deben apoyarse en `alert`, `prompt` o `confirm` nativos. Deben resolverse con overlays propios, claros y cuidados.

## Principios de producto

- El cielo es el protagonista.
- El diario es el lugar de lectura y edicion tranquila.
- La toolbar debe ser discreta.
- Menos texto fijo, mas espacio para visualizar.
- Recompensa rapida.
- Movimiento suave y sutil.
- Privacidad por defecto.
- Autoria por encima de automatismos innecesarios.
- La claridad visual debe ser alta y la jerarquia debe poder entenderse de un vistazo.
