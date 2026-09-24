# fast-table

En hurtig, signal-baseret datatabel til Angular (v22+) med DOM-virtualisering, rækkegruppering, trædata, pivotering,
en indbygget formelmotor, celleredigering, diagrammer og eksport — bygget som en selvstændig Angular-pakke uden
eksterne UI-afhængigheder.

Hele griddet er drevet af Angular signals (`computed`/`effect`), så kun de dele af pipelinen, der reelt påvirkes af en
ændring (data, sortering, filter, gruppering), genberegnes — og kun rækker/kolonner inden for det synlige
viewport-vindue rendres til DOM'en, uanset om datasættet har 100 eller 100.000 rækker.

## Installation

```bash
npm install fast-table
```

`fast-table` har `@angular/core`, `@angular/common` og `@angular/forms` som peer dependencies (Angular 22+).

## Kom i gang

```ts
import { Component } from '@angular/core';
import { FtTableComponent, type ColDef } from 'fast-table';

interface Person {
  id: number;
  name: string;
  age: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FtTableComponent],
  template: `<ft-table [columnDefs]="columnDefs" [rowData]="rowData" style="height: 600px" />`,
})
export class App {
  rowData: Person[] = [
    { id: 1, name: 'Ada Lovelace', age: 36 },
    { id: 2, name: 'Alan Turing', age: 41 },
  ];

  columnDefs: ColDef<Person>[] = [
    { field: 'id', headerName: 'ID', width: 80, pinned: 'left' },
    { field: 'name', headerName: 'Navn', width: 200, filter: 'text', editable: true },
    { field: 'age', headerName: 'Alder', width: 100, type: 'number', filter: 'number' },
  ];
}
```

`<ft-table>` skal have en bestemt højde fra sin forælder (fx `height: 600px` eller et flex-layout med `flex: 1;
min-height: 0;`) — komponenten selv sætter `height: 100%`, men kan ikke opfinde plads sin forælder ikke giver den.

For fuld kontrol (paginering, master-detail, server-side data, RTL osv.) bruges `[gridOptions]` i stedet for de
separate `[columnDefs]`/`[rowData]` inputs — se `GridOptions<TData>`.

## Demo-appen

Repoet indeholder en demo-app (`projects/demo`) med ét afsnit pr. funktionsområde:

```bash
npm start   # ng serve demo
```

## Funktionsoversigt

**Kolonner** — ColDef/ColumnGroupDef, kolonnegrupper, dynamisk bredde (px/flex/autotilpas), træk-og-slip-omplacering,
fastfrysning (venstre/højre), colSpan, kolonnetilstand (eksport/import via `getColumnState`/`applyColumnState`).

**Rækker** — unikke række-id'er (`getRowId`), multikolonne-sortering, rækkenummerering, rækkefastfrysning
(pinned top/bottom), dynamisk rækkehøjde, paginering, træk-og-slip rækkeomplacering, fuld-bredde rækker.

**Celler** — indbyggede typer (tekst, tal, dato, boolean), valueGetter/valueFormatter/valueSetter, brugerdefinerede
cellerenderere og -redigeringskomponenter, celle-kommentarer, celleopdaterings-cache.

**Redigering** — standardredigeringskomponenter (tekst/tal/dato/checkbox/select/stort tekstfelt/formel), validering,
fuld rækkeredigering med gem/annuller, fortryd/gentag, høj-hastigheds transaktioner (`applyTransaction`).

**Filtrering** — kolonnefiltre (tekst/tal/dato/mængde), relative datofiltre, flydende filtre, hurtigfilter, eksternt
filter, avanceret visuel filterbygger (AND/OR-træer).

**Markering & regneark** — rækkevalg, celleområdemarkering, udfyldningshåndtag (lineær serie-udfyldning), formelmotor
(`=SUM(A1:A5)`, `IF`, `AVERAGE` osv. med cellereferencer og brugerdefinerede funktioner).

**Hierarki & aggregering** — rækkegruppering, trædata (`getDataPath`), aggregeringsfunktioner, hovedtotaler,
pivottilstand med dynamiske resultatkolonner, master-detail.

**Datamodeller** — in-memory (standard), uendelig (infinite) og server-side row model via en fælles
datasource-kontrakt.

**UI & visualisering** — værktøjslinje, sidepanel (kolonner/filtre), statuslinje, kontekstmenu, integrerede
diagrammer (søjle/linje/cirkel/scatter) fra celleområder, sparklines.

**Eksport** — CSV, Excel (SpreadsheetML), PDF, udklipsholder (kopier/indsæt).

**Diverse** — justerede tabeller (`[alignedGrids]`), RTL, ARIA-roller og fuld tastaturnavigation.

## Arkitektur

Kernen ligger i `src/lib/core/` (`ColumnModel`, `ClientSideRowModel`, `ValueService`, `FilterService`,
`SelectionService`, `EditingService`, `ViewportModel`, `GridApi`) og er organiseret som Angular-services, der
provideres pr. grid-instans (`FtTableComponent`s egen `providers`-liste), så flere grid på samme side ikke deler
tilstand. Funktionsspecifik logik (pivot, formler, eksport, diagrammer, kommentarer osv.) ligger i `src/lib/features/`.
