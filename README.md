# SETESTRELO

Setestrelo es una app web de manifestación poética construida alrededor de `cielos` personales.

Cada cielo funciona como una página viva del diario. Dentro de él, la persona guarda `estrellas` con `título + nota`, las mueve, las relaciona en `constelaciones`, crea `resonancias` entre notas y puede releerlas en un `modo diario` más calmado y artesanal.

## Estado actual

El proyecto está en fase de prototipo interactivo, pero ya incluye una base navegable y bastante avanzada.

### Ya funciona

- Crear, renombrar, reordenar y borrar cielos.
- Crear estrellas con `título`, `nota`, color, forma y tamaño.
- Mover estrellas dentro del cielo y enviarlas a otro cielo.
- Crear y editar constelaciones manuales.
- Crear resonancias semánticas entre estrellas usando referencias como `{Nombre de otra nota}`.
- Visualizar resonancias y constelaciones en el visor del cielo.
- Abrir un modo diario con lectura y edición de entradas.
- Activar un modo `Contemplar` para ver aparecer las palabras del cielo a un ritmo pausado.
- Guardar datos en el navegador con persistencia local reforzada.
- Exportar e importar backup en `.json`.

### En evolución

- Pulido visual fino de la interfaz.
- Ajustes de jerarquía, responsive y estados vacíos.
- Refinamiento de la identidad visual entre `cielo`, `diario` y `panel lateral`.

## Idea del producto

Setestrelo no quiere ser una app de astronomía ni un dashboard genérico.

Quiere sentirse como:

- un observatorio nocturno
- un archivo de cielos personales
- un diario de manifestación con memoria visual

La estructura conceptual actual es:

- `Cielos`: espacios personales o temas creados por la usuaria.
- `Estrellas`: notas de manifestación con presencia visual.
- `Constelaciones`: relaciones creadas manualmente entre estrellas.
- `Resonancias`: vínculos semánticos entre notas que comparten mundo y pueden visualizarse en el visor.
- `Diario`: lectura tranquila y edición fuera del cielo.

## Un propósito posible

Una de las líneas más importantes del proyecto tiene que ver con **hacer visible lo que todavía cuesta iniciar**.

Esta lectura nace de una forma concreta en la que yo misma estoy usando Setestrelo: crear cielos para tareas, ideas o bloques de acción que me producen parálisis, dividirlos en estrellas más pequeñas y visualizar sus relaciones antes de actuar.

No es la única manera de usarlo, pero sí una que está influyendo mucho en su diseño. Por eso Setestrelo también puede entenderse como:

- un atlas de microacciones
- una interfaz para imaginar antes de ejecutar
- un puente visual entre intención, preparación y movimiento

He desarrollado esta idea con más detalle en:

- [ABOUT: propósito, marco técnico y bibliografía](./docs/about-setestrelo.md)

## Cómo se usa hoy

Setestrelo funciona ya como un atlas con dos superficies complementarias:

- `Visor de cielos`: para habitar un cielo, mover estrellas, tejer constelaciones y ver relaciones.
- `Diario`: para leer y editar entradas con más calma, como si fuesen páginas de un cuaderno.

Dentro de cada cielo puedes:

- crear nuevas estrellas
- añadirlas a constelaciones existentes o tejer una nueva constelación
- moverlas a otro cielo
- relacionarlas mediante resonancias
- activar `Contemplar` para visualizar tus palabras lentamente dentro del cielo

Las resonancias se escriben en el texto de una nota usando llaves, por ejemplo:

```text
Resonar con {Nombre de otra nota}
```

Cuando esa referencia encuentra otra estrella, Setestrelo crea un vínculo semántico y puede mostrarlo en el visor.

## Stack

- `Vite`
- `React 19`
- `TypeScript`
- `Motion`

## Cómo ejecutarlo

```bash
npm install
npm run dev
```

Para generar build de producción:

```bash
npm run build
```

## Estructura del proyecto

```text
src/
  App.tsx            # App principal y lógica de interacción
  main.tsx           # Entrada de Vite/React
  styles/
    app.css          # Estilos principales
    tokens.css       # Tokens de color, radios, sombras

public/
  favicon-star.svg   # Favicon actual
  sky-assets/        # Lunas, planetas, texturas y fondos del visor

docs/
  atlas-de-luz-producto.md
  atlas-de-luz-arquitectura.md
  atlas-de-luz-arte-ui.md
  session-handoff-2026-04-01.md
```

## Documentación

- [Producto](./docs/atlas-de-luz-producto.md)
- [Arquitectura](./docs/atlas-de-luz-arquitectura.md)
- [Arte y UX](./docs/atlas-de-luz-arte-ui.md)
- [About Setestrelo](./docs/about-setestrelo.md)
- [Handoff de sesión 2026-04-03](./docs/session-handoff-2026-04-03.md)
- [Handoff de sesión](./docs/session-handoff-2026-04-01.md)

## Persistencia y backups

Setestrelo guarda el atlas en el navegador con varias capas locales de persistencia:

- `IndexedDB` como almacenamiento principal
- `localStorage` como respaldo rápido
- copia de recuperación e historial local recientes

Por eso:

- si cambias de navegador, de perfil o de origen (`localhost`, `127.0.0.1`, otro puerto), no verás necesariamente el mismo atlas
- si limpias los datos del navegador, puedes perder tu atlas
- conviene exportar copias `.json` si quieres conservar un backup

## Notas

- El nombre visual del proyecto es `SETESTRELO`.
- El código todavía conserva algunas referencias antiguas a `Atlas de Luz` porque el concepto evolucionó desde ahí.
- El foco actual está en dejar una experiencia clara, bonita y emocionalmente coherente antes de seguir ampliando funcionalidades.
- La interfaz sigue en evolución visual: se está desplazando desde una lógica de “widgets” hacia una estética más integrada, plana y editorial.
