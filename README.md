# SETESTRELO

Setestrelo es una app web de manifestacion poetica construida alrededor de `cielos` personales.

Cada cielo funciona como una pagina viva del diario. Dentro de el, la persona guarda `estrellas` con `titulo + nota`, las mueve, las relaciona en `constelaciones` y puede releerlas en un `modo diario` mas calmado y artesanal.

## Estado actual

El proyecto esta en fase de prototipo interactivo, pero ya incluye una base navegable y bastante avanzada.

### Ya funciona

- Crear, renombrar, reordenar y borrar cielos.
- Crear estrellas con `titulo`, `nota`, color, forma y tamano.
- Mover estrellas dentro del cielo y enviarlas a otro cielo.
- Crear y editar constelaciones manuales.
- Abrir un modo diario con lectura y edicion de entradas.
- Guardar datos en el navegador.
- Exportar e importar backup en `.json`.

### En evolucion

- Pulido visual fino de la interfaz.
- Ajustes de jerarquia, responsive y estados vacios.
- Refinamiento de la identidad visual entre `cielo`, `diario` y `panel lateral`.

## Idea del producto

Setestrelo no quiere ser una app de astronomia ni un dashboard generico.

Quiere sentirse como:

- un observatorio nocturno
- un archivo de cielos personales
- un diario de manifestacion con memoria visual

La estructura conceptual actual es:

- `Cielos`: espacios personales o temas creados por la usuaria.
- `Estrellas`: notas de manifestacion con presencia visual.
- `Constelaciones`: relaciones creadas manualmente entre estrellas.
- `Diario`: lectura tranquila y edicion fuera del cielo.

## Stack

- `Vite`
- `React 19`
- `TypeScript`
- `Motion`

## Como ejecutarlo

```bash
npm install
npm run dev
```

Para generar build de produccion:

```bash
npm run build
```

## Estructura del proyecto

```text
src/
  App.tsx            # App principal y logica de interaccion
  main.tsx           # Entrada de Vite/React
  styles/
    app.css          # Estilos principales
    tokens.css       # Tokens de color, radios, sombras

public/
  favicon-star.svg   # Favicon actual

docs/
  atlas-de-luz-producto.md
  atlas-de-luz-arquitectura.md
  atlas-de-luz-arte-ui.md
  session-handoff-2026-04-01.md
```

## Documentacion

- [Producto](./docs/atlas-de-luz-producto.md)
- [Arquitectura](./docs/atlas-de-luz-arquitectura.md)
- [Arte y UX](./docs/atlas-de-luz-arte-ui.md)
- [Handoff de sesion](./docs/session-handoff-2026-04-01.md)

## Persistencia y backups

Setestrelo guarda el atlas en el navegador mediante almacenamiento local.

Por eso:

- si limpias los datos del navegador, puedes perder tu atlas
- conviene exportar copias `.json` si quieres conservar un backup

## Notas

- El nombre visual del proyecto es `SETESTRELO`.
- El codigo todavia conserva algunas referencias antiguas a `Atlas de Luz` porque el concepto evoluciono desde ahi.
- El foco actual esta en dejar una experiencia clara, bonita y emocionalmente coherente antes de seguir ampliando funcionalidades.
