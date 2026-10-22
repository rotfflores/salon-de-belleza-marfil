/*
  Configuración compartida de marca y contacto.

  salonName:       nombre que aparece en el logotipo y en el título de la pestaña.
  whatsappNumber:  número con código de país (México: 52 + 10 dígitos).
                   Vacío o inválido: dirige las consultas a Contacto; no abre WhatsApp.
  whatsappMessage: mensaje de los botones "Solicitar cita".
  serviceMessage:  mensaje de los botones "Elegir servicio"; {servicio} se reemplaza por el nombre del servicio.
  isDemo:          true desactiva WhatsApp y dirige las consultas a Contacto.
  hours:          lista de { days: "Lunes a viernes", time: "10:00–19:00" }.
  instagram:      usuario, con o sin @; no pegues una URL.
  facebook:       nombre de la página tal como se muestra en el sitio.
  facebookUrl:    dirección exacta de la página (https://www.facebook.com/...). Vacía: el enlace busca el nombre en Facebook.
  location:       coordenadas numéricas válidas para activar mapa y Cómo llegar.
  booking:        sistema de citas de Contacto.
                  schedule: horario de citas por día (0 domingo … 6 sábado) → ["apertura", "cierre"]; el día que falta, cerrado.
                  Si cambias el horario, actualiza también hours para que coincidan.
                  slotMinutes: cada cuántos minutos se ofrece un horario. daysAhead: días disponibles hacia adelante.
                  demo: true muestra la nota de demostración (disponibilidad simulada; la cita se confirma por WhatsApp).
  Los campos vacíos muestran “Información por confirmar”.
*/
window.SITE_CONFIG = {
  salonName: "Marfil",
  isDemo: false,
  whatsappNumber: "526182051723",
  whatsappMessage: "Hola, Marfil. Me gustaría consultar disponibilidad para una cita.",
  serviceMessage: "Hola, me interesa el servicio de {servicio}. ¿Podrían compartirme disponibilidad y confirmar el precio?",
  address: "",
  references: "",
  hours: [
    { days: "Lunes a viernes", time: "10:00–19:00" },
    { days: "Sábado", time: "09:00–15:00" },
    { days: "Domingo", time: "Cerrado" }
  ],
  phoneNumber: "",
  instagram: "rotf.studio",
  facebook: "Rotf studio",
  facebookUrl: "https://www.facebook.com/profile.php?id=61593890957309",
  location: { latitude: null, longitude: null },
  booking: {
    schedule: { 1: ["10:00", "19:00"], 2: ["10:00", "19:00"], 3: ["10:00", "19:00"], 4: ["10:00", "19:00"], 5: ["10:00", "19:00"], 6: ["09:00", "15:00"] },
    slotMinutes: 30,
    daysAhead: 60,
    demo: true
  }
};
