# Carmelitas Descalzos Latinoamérica · Demo

Prototipo interactivo de una app para la familia carmelita en los 19 países de habla hispana de Latinoamérica. Es una demostración no oficial y usa datos de ejemplo.

## Qué incluye

- **App móvil** (`index.html`): registro con verificación por código, inicio de sesión (email, teléfono, Google y Apple simulados), elección de país y comunidad, Evangelio orado del día, santoral carmelita, oración con audio, comunidades, eventos con inscripción, donativos en moneda local, perfil con privacidad y borrado de cuenta.
- **Panel de administración**: métricas, usuarios por país, aprobación de miembros, publicación de eventos y envío de notificaciones que llegan a la app al instante.
- **Cuestionario para el cliente** (`formulario.html`): preguntas en lenguaje simple para definir la app. Las respuestas llegan por correo vía [FormSubmit](https://formsubmit.co).

## Probar

Cuenta de prueba: `demo@carmelo.app` · contraseña `demo123`. Código de verificación: `123456`.

Todo funciona sin servidor; el estado se guarda en el navegador. "Reiniciar demo" (al pie de la presentación) vuelve todo a cero.

## Configurar

Editar `config.js`:

- `CONTACT`: nombre, email y WhatsApp que aparecen en la sección de contacto.
- `FORM_EMAIL`: correo donde llegan las respuestas del cuestionario. El primer envío dispara un correo de activación de FormSubmit; hay que confirmarlo para empezar a recibir respuestas.

## Publicar

Es un sitio estático: GitHub Pages lo sirve directo desde la rama `main`, sin build.
