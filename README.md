# fast-table (workspace)

Dette er et Angular CLI-workspace med to projekter:

- **`projects/fast-table`** — selve tabelbiblioteket. Se [`projects/fast-table/README.md`](projects/fast-table/README.md)
  for funktionsoversigt og brug.
- **`projects/demo`** — en demo-app med ét afsnit pr. funktionsområde (grundlæggende, redigering, gruppering, pivot,
  formler, markering/udfyldning, diagrammer, eksport, store datasæt, justerede tabeller, kommentarer/DnD/RTL/a11y).

## Kør demoen

```bash
npm install
npm start          # ng serve demo — åbner på http://localhost:4200
```

## Byg biblioteket

```bash
npx ng build fast-table
```

Output havner i `dist/fast-table` som en publiceringsklar Angular-pakke (`npm publish` derfra).

## Byg demoen

```bash
npx ng build demo
```
