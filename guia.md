# 🚀 Guía Completa: Sistema POS con React + Node.js

Esta guía te llevará paso a paso para crear un sistema POS completo con React (frontend) y Node.js (backend).

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:
- **Node.js** (versión 18 o superior)
- **npm** (viene con Node.js)
- Un editor de código (VS Code recomendado)

## 🏗️ Paso 1: Crear la Estructura Base del Proyecto

### 1.1 Crear la carpeta principal
```bash
# Crear la carpeta del proyecto
mkdir pos-system

# Entrar a la carpeta
cd pos-system

# Crear las carpetas para frontend y backend
mkdir frontend backend
```

**¿Qué acabas de hacer?**
- Creaste una carpeta principal llamada `pos-system`
- Dentro creaste dos carpetas: `frontend` (para React) y `backend` (para Node.js)

---

## 🎨 Paso 2: Configurar el Frontend (React + TypeScript)

### 2.1 Crear el proyecto React
```bash
# Ir a la carpeta frontend
cd frontend

# Crear proyecto React con Vite y TypeScript
npm create vite@latest . -- --template react-ts

# Instalar las dependencias básicas
npm install
```

**¿Qué es esto?**
- **Vite**: Es un bundler súper rápido para desarrollar con React
- **TypeScript**: Te ayuda a escribir código más seguro y con menos errores
- **React**: La librería para crear interfaces de usuario

### 2.2 Instalar dependencias adicionales
```bash
# Herramientas para el desarrollo
npm install @tanstack/react-query zustand react-router-dom axios
npm install @types/node
```

**¿Para qué sirve cada una?**
- **@tanstack/react-query**: Maneja datos del servidor (peticiones HTTP)
- **zustand**: Maneja el estado global de la aplicación
- **react-router-dom**: Maneja las rutas/páginas de tu aplicación
- **axios**: Para hacer peticiones HTTP al backend
- **@types/node**: Tipos de TypeScript para Node.js

### 2.3 Configurar Tailwind CSS (para los estilos)

#### A. Limpiar instalaciones previas (si las hay)
```bash
npm uninstall tailwindcss @tailwindcss/vite
npm cache clean --force
```

#### B. Instalar Tailwind CSS correctamente
```bash
npm install -D tailwindcss postcss autoprefixer
npm install -D @tailwindcss/postcss
```

#### C. Crear archivo de configuración de PostCSS
Crea un archivo llamado `postcss.config.js` en la carpeta `frontend`:

```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

#### D. Crear archivo de configuración de Tailwind
Crea un archivo llamado `tailwind.config.js` en la carpeta `frontend`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

#### E. Configurar el archivo de estilos
Reemplaza el contenido de `src/index.css` con:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**¿Qué es Tailwind CSS?**
- Es un framework de CSS que te permite crear estilos rápidamente
- En lugar de escribir CSS, usas clases como `bg-blue-500` o `text-white`

### 2.4 Probar que el frontend funciona
```bash
# Iniciar el servidor de desarrollo
npm run dev
```

Deberías ver algo como: `Local: http://localhost:5173/`

---

## 🛠️ Paso 3: Configurar el Backend (Node.js + Express)

### 3.1 Ir a la carpeta backend
```bash
# Desde la carpeta frontend, regresar a la principal
cd ../backend
```

npm install cookie-parser

### 3.2 Inicializar el proyecto Node.js
```bash
# Crear el archivo package.json
npm init -y
```

### 3.3 Instalar dependencias del servidor
```bash
# Dependencias principales
npm install express cors helmet morgan dotenv

# Base de datos con Prisma
npm install prisma @prisma/client

# Base de datos 

npm install pg

# Autenticación y seguridad
npm install bcryptjs jsonwebtoken
```

**¿Para qué sirve cada una?**
- **express**: Framework web para Node.js (tu servidor)
- **cors**: Permite que el frontend se conecte al backend
- **helmet**: Añade seguridad a tu servidor
- **morgan**: Registra las peticiones HTTP
- **dotenv**: Maneja variables de entorno (.env)
- **prisma**: ORM para manejar la base de datos
- **bcryptjs**: Para encriptar contraseñas
- **jsonwebtoken**: Para crear tokens de autenticación

### 3.4 Instalar dependencias de desarrollo
```bash
# Herramientas de desarrollo
npm install -D @types/node @types/express @types/bcryptjs @types/jsonwebtoken
npm install -D nodemon typescript ts-node
```

**¿Para qué sirven?**
- **@types/**: Tipos de TypeScript para las librerías
- **nodemon**: Reinicia automáticamente el servidor cuando cambias código
- **typescript**: Compilador de TypeScript
- **ts-node**: Ejecuta TypeScript directamente

### 3.5 Configurar TypeScript
```bash
# Crear archivo de configuración de TypeScript
npx tsc --init
```

### 3.6 Configurar Prisma (Base de datos)
```bash
# Inicializar Prisma
npx prisma init
```

Esto creará:
- Una carpeta `prisma/` con el archivo `schema.prisma`
- Un archivo `.env` para las variables de entorno

---

## 🎯 ¿Qué tienes hasta ahora?

```
pos-system/
├── frontend/          # Tu aplicación React
│   ├── src/
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
├── backend/           # Tu servidor Node.js
│   ├── prisma/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
```

---

## 🚀 Próximos Pasos

1. **Configurar la base de datos** en Prisma
2. **Crear las rutas del API** en Express
3. **Diseñar la interfaz** con React y Tailwind
4. **Conectar frontend y backend**
5. **Implementar autenticación**
6. **Agregar funcionalidades del POS**

## 💡 Consejos Importantes

- **Siempre** ejecuta `npm install` después de agregar dependencias
- **Guarda** todos los archivos antes de probar
- **Revisa la consola** para ver errores
- **Usa Git** para versionar tu código
- **Haz commits frecuentes** de tus cambios

## 🆘 ¿Problemas?

Si encuentras errores:
1. Lee el mensaje de error completo
2. Verifica que estés en la carpeta correcta
3. Asegúrate de haber instalado todas las dependencias
4. Reinicia el servidor con `Ctrl+C` y `npm run dev`

¡Ya tienes la base sólida para tu sistema POS! 🎉