# 📅 Aplicativo de Citas - Servicios de Apoyo
**Universidad Nacional de Colombia - Sede Bogotá**  
Facultad de Ingeniería
Vicedecanatura de Investigación y Extensión  

---

## 📌 Descripción General

Este aplicativo web permite agendar citas con los profesionales de apoyo de la Vicedecanatura de Investigación y Extensión de la Facultad de Ingeniería de la Universidad Nacional de Colombia, donde se utiliza Google Apps Script junto a **Google Calendar** para automatizar y facilitar el proceso. Está dividido en dos módulos principales:

- **Aplicativo de Citas**: Página web que permite consultar horarios, agendar citas, y verificar sanciones.
- **Aplicativo de Sanciones**: Herramienta para registrar inasistencias y penalizar a los usuarios.

---

## ⚙️ Funcionalidades Principales

### Aplicativo de Citas
- Consulta automática de **franjas horarias disponibles**.
- Validación de datos y verificación de sanciones antes de agendar.
- Reserva y bloqueo automático de horarios en Google Calendar.
- Notificación al usuario y registro en el **historial de citas**.
- Interfaz desarrollada en **HTML, CSS y JavaScript**, alojada y protegida mediante **Google Apps Script**.

### Aplicativo de Sanciones
- Registro de inasistencias por parte de los profesionales.
- Aplicación automática de sanciones según el historial del usuario.
- Validación de fechas y horarios para evitar errores en el registro.

---

## 🤖 Automatizaciones

El sistema cuenta con funciones automáticas para mejorar su eficiencia:

- `appointmentEliminator()`: Elimina citas canceladas por los usuarios.
- `subtractDay()`: Descuenta días a sanciones vigentes y las elimina al vencerse.
- `createConsolidated()`: Crea un consolidado de todo los historiales de citas.
---

## 🧰 Herramientas Utilizadas

- **Google Apps Script**
- **Google Calendar API**
- **Google Sheets** (como base de datos y almacenamiento de historiales)
- **HTML/CSS/JavaScript** (Interfaz de usuario)
- **GitHub** (Repositorio de archivos visuales: [Repositorio AppCitas](https://github.com/VicedecanaturaUnal/AppCitas))

---

## 🗃️ Estructura del Proyecto

- `WebSites - App. Citas`: Código HTML, CSS, JS y scripts de Backend.
- `Penalty - App. Sanciones`: Módulo para gestión de sanciones.
- `Database – Aplicativos`: Base de datos con servicios y horarios.
- `Historial de citas YYYY`: Registro anual de citas realizadas.
- `DataAPI - App. Citas`: API para carga dinámica de elementos y horarios.

---

## 📈 Actualizaciones y Mantenimiento

El sistema permite ajustes flexibles mediante la base de datos general:
- Cambiar horarios de atención.
- Modificar textos y elementos del formulario.
- Implementar nuevos servicios de apoyo con facilidad.

---
By Yovany Vargas  
📬 Contacto: yvargasgu@unal.edu.co
