# mmo-format
## instalación
```ts
npm install terkojones/mmo-format
```
## uso
```ts
import format from 'mmo-format' 
```

Los marcadores de posición para los datos son:
* `#<expr>#: Se utiliza para referenciar los datos de contexto. `expr` es cualquier expresión js válida que utilize los datos de contexto.
* `##`: Se utiliza para referenciar a los datos extras pasados a la función format, funciona como `util.format` sólo que el tipo de dato se infiere y el formato para el mismo depende de si se indicaron o no opciones de inspección en la llamada a format.
* `\#`: Escapa el caracter de marcado '#'.
## Función objeto `format`
Cadenifica los datos pasados como un mensaje.
```ts
format(options: InspectOptions | boolean, context: TContext, message: string, ...args: any[]): string;
format(options: InspectOptions | boolean, context: TContext, ...args: any[]): string;
format(context: TContext, message: string, ...args: any[]): string;
format(context: TContext, ...args: any[]): string;
format(options: InspectOptions | boolean, message?: string, ...args: any[]): string;
format(options: InspectOptions | boolean, ...args: any[]): string;
format(message: string, ...args: any[]): string;
```
 * `options`:   Opciones de inspección(util.inpect) o true para opciones por defecto. False u omisión implica que la cadenificación será tipo `toString`.
 * `context`:   Objecto contextualizado de datos
 * `message`:   Mensaje a reproducir
 * `args`:      Argumentos para los marcadores de posición y/o datos a convertir en cadena.

### Función miembro `format.customizeInspection`
Establece inspecciones personalizadas para la clase indicada
```ts
customizeInspection(Class: TObjectConstructor, info: TInspectInfo) 
```
* `Class`: ObjectConstructor que se inspeccionara de forma personalizada.
* `info`:  Objeto con las functiones para inspeccionar y las opciones por defecto si son necesarias.
#### Tipo `TInspectInfo`
```ts
type TInspectInfo = {
    inspect?: (object: any, options?: InspectOptions) => string,
    stringify?: (object: any) => string,
    options?: InspectOptions
}
```
* `inspect`: Función de inspección tipo `util.inspect`.
* `stringify`: Función de inspección tipo `toString`
* `options`: Opciones para `inspect`. Estas opciones, si se indican, sobreescribiran cualquieras otras que se hayan pasado a `format`.

### Método miembro `format.contextualize`
Convierte el objeto pasado en un contexto válido para las inspecciones.
```ts
contextualize(object: TSandbox): TContext 
```
* `object`:  Objeto a contextualizar

### función miembro 'format.isContextualize`
Determina si el objeto pasado está contextualizado.
```ts
isContextualize(object: any): boolean 
```
* `object`: Objeto a comprobar

### Función miembro `format.transform`
Devuelve un stream de transformación que reeplazará los marcadores de posición por sus respectivos datos en el contexto.
```ts
transform(context: TSandbox | TContext, options?: InspectOptions | boolean): Transform
```
* `context`: Contexto de datos.
* `options`: Opciones de inspección como en `format`.
## Ejemplo
```ts
import format from '../index';
import { inspect } from 'util';

class Work {
    company: string;
    job: string;
    constructor(company: string, job: string) {
        this.company = company;
        this.job = job;
    }
}
let sandbox: format.Sandbox = {
    name: 'Pedro',
    surname: 'Piqueras',
    age: 25,
    work: new Work('JB ltd.', 'drinker')
}

const context = format.contextualize(sandbox);

// suponiendo que demo.txt tenga marcadores de posición
const readable = fs.createReadStream('.../demo.txt', 'utf8');
// demo.replaced.txt con marcadores reemplazados.
const writable = fs.createWriteStream('.../demo.replaced.txt', 'utf8');

// Establece inspecciones a medida para el tipo work,
format.customizeInspection(Work, {
    stringify: (obj: Work) => `${obj.job} in ${obj.company}`,
    inspect: (obj: Work, options: InspectOptions) => inspect(obj, options)
})

// Cadenifica tipo toString.
console.log(format(context, "Me llamo #name + ' ' + surname# y gano ## y soy #work#", 2500));
// Cadenifica tipo util.inspect con las opciones por defecto de éste.
console.log(format(true, sandbox, "Me llamo #name + ' ' + surname# y gano ## y soy #work#", 2500));
// Cadenifica tipo util.inspect con las opciones pasadas.
console.log(format({
    compact: false
}, sandbox, "Me llamo #name + ' ' + surname# y gano ## y soy #work#", 2500));

readable.pipe(format.transform(sandbox)).pipe(writable);

```
produce una salida
```
Me llamo Pedro Piqueras y gano 2500 y soy drinker in JB ltd.
Me llamo 'Pedro Piqueras' y gano 2500 y soy Work { company: 'JB ltd.', job: 'drinker' }
Me llamo 'Pedro Piqueras' y gano 2500 y soy Work {
  company: 'JB ltd.',
  job: 'drinker'
}
```
y el archivo `demo.txt`
```
Me llamo #surname#, #name# #surname# 
```
generará `demo.replaced.txt` con: 
```
Me llamo Piqueras, Pedro Piqueras 
```


