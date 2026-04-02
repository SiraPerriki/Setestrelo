# Arquitectura del MVP

## Recomendacion principal

Stack para la primera version:

- `Vite`
- `React`
- `Motion`
- `SVG` para la escena principal
- `localStorage` para persistencia

## Por que este stack

- Permite iterar rapido.
- Encaja muy bien con una UI ilustrada y animada.
- Permite estrellas arrastrables, lineas de constelacion y capas de ambiente sin complejidad excesiva.
- Deja abierta una evolucion posterior hacia Canvas o WebGL si hiciera falta.

## Estructura recomendada

```text
src/
  App.tsx
  styles/
    tokens.css
    app.css
```

Refactor futuro recomendado:

```text
src/
  app/
    App.tsx
  components/
    TopToolbar.tsx
    SkyCanvas.tsx
    SkyTabs.tsx
    StarComposer.tsx
    StarInspector.tsx
    JournalView.tsx
    HelpOverlay.tsx
    BackupOverlay.tsx
  hooks/
    useAtlasStorage.ts
    useSkySelection.ts
    useStarLayout.ts
    useStarDrag.ts
  lib/
    atlas.ts
    exportImport.ts
    labels.ts
    constellations.ts
  styles/
    tokens.css
    app.css
  types/
    atlas.ts
```

## Modelo de datos inicial

```ts
type SkyRecord = {
  id: string
  name: string
  createdAt: string
  capacity: number
  theme: "night" | "rose" | "dawn" | "aurora"
}
```

```ts
type StarRecord = {
  id: string
  skyId: string
  createdAt: string
  title: string
  note: string
  showTitle: boolean
  color: "gold" | "pearl" | "coral" | "sky"
  size: "s" | "m" | "l"
  shape: "orb" | "diamond" | "spark"
  x: number
  y: number
}
```

```ts
type ConstellationRecord = {
  id: string
  skyId: string
  name: string
  starIds: string[]
}
```

## Superficies principales

- `sky`: composicion viva, drag, constelaciones y ritual de nacimiento
- `journal`: lista de entradas por fecha y lectura/edicion a pantalla completa
- `overlay`: ayuda y backup

## Logica del atlas

- La app mantiene una lista de cielos.
- Hay un cielo activo.
- Cada cielo tiene capacidad limitada.
- Las estrellas se colocan intentando evitar solapes visuales.
- Las etiquetas se posicionan intentando evitar colisiones.
- Las constelaciones son manuales y usan segmentos rectos entre centros de estrellas.
- El diario muestra las estrellas del cielo activo ordenadas por fecha.

## Capas de la escena

1. Fondo de gradiente
2. Nebulosas suaves
3. Campo de estrellas lejanas
4. Particulas atmosfericas
5. Estrellas del cielo activo
6. Lineas de constelacion
7. Efecto de nacimiento
8. UI

## Animaciones clave

- Viaje del polvo estelar hacia el punto de nacimiento
- Aparicion de la estrella al final del viaje
- Titileo muy sutil de cada estrella
- Flotacion lenta de particulas
- Resaltado de estrella seleccionada
- Aparicion suave de una constelacion manual
- Estrella fugaz ocasional en el fondo

## Layout recomendado

Desktop:

- toolbar superior discreta
- tabs de cielos tipo archivador
- gran lienzo del cielo
- un unico panel lateral dominante segun el estado
- modo diario a pantalla completa

Movil:

- toolbar compacta
- cielo en vertical
- inspector en panel inferior o modal
- diario en vista vertical unica

## Persistencia

Primera fase:

- `localStorage`
- exportacion e importacion en `.json`
- sin backend

Segunda fase:

- `IndexedDB` si la complejidad local crece
- `Supabase`
- autenticacion opcional
- sincronizacion entre dispositivos

## Criterios tecnicos del MVP

- Debe cargar rapido.
- Debe sentirse bien en movil y escritorio.
- Debe mantener el cielo visible de un vistazo en desktop.
- Debe permitir mover estrellas sin saltos.
- Debe separar bien `clic` y `drag`.
- Debe permitir editar estrellas sin confusion.
- Debe ofrecer un modo diario claro y usable.

## Riesgos a vigilar

- Sobrecargar la escena con demasiadas capas o blur
- Exceso de UI alrededor del cielo
- Solapes de estrellas y etiquetas
- Animaciones bonitas pero desincronizadas
- Automatismos que resten autoria a la persona
- Falta de claridad visual para personas con TDAH
