export interface Person {
  id: number;
  name: string;
  age: number;
  country: string;
  city: string;
  department: string;
  salary: number;
  active: boolean;
  joined: Date;
  rating: number;
  history: number[];
}

export const COUNTRIES = ['Denmark', 'Sweden', 'Norway', 'Germany', 'France', 'USA'];
export const CITIES: Record<string, string[]> = {
  Denmark: ['Copenhagen', 'Aarhus', 'Odense'],
  Sweden: ['Stockholm', 'Gothenburg', 'Malmo'],
  Norway: ['Oslo', 'Bergen', 'Trondheim'],
  Germany: ['Berlin', 'Munich', 'Hamburg'],
  France: ['Paris', 'Lyon', 'Marseille'],
  USA: ['New York', 'Chicago', 'Austin'],
};
export const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'Support', 'Finance'];

export function makePeople(count: number): Person[] {
  const rows: Person[] = [];
  for (let i = 0; i < count; i++) {
    const country = COUNTRIES[i % COUNTRIES.length];
    const cities = CITIES[country];
    rows.push({
      id: i + 1,
      name: `Person ${i + 1}`,
      age: 20 + (i % 45),
      country,
      city: cities[i % cities.length],
      department: DEPARTMENTS[i % DEPARTMENTS.length],
      salary: 30000 + ((i * 137) % 70000),
      active: i % 3 !== 0,
      joined: new Date(2015 + (i % 10), i % 12, (i % 28) + 1),
      rating: Math.round(((i * 37) % 50) / 10),
      history: Array.from({ length: 8 }, (_, k) => 20 + ((i * 13 + k * 29) % 80)),
    });
  }
  return rows;
}

export interface OrderLine {
  id: number;
  product: string;
  quantity: number;
  price: number;
}

export function makeOrderLines(personId: number): OrderLine[] {
  const products = ['Widget', 'Gadget', 'Gizmo', 'Doohickey', 'Thingamajig'];
  const count = 1 + (personId % 4);
  return Array.from({ length: count }, (_, i) => ({
    id: personId * 100 + i,
    product: products[(personId + i) % products.length],
    quantity: 1 + ((personId + i) % 5),
    price: 50 + ((personId * 7 + i * 23) % 400),
  }));
}
