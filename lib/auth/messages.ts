type AuthAction = "login" | "signup" | "recovery" | "password" | "profile" | "guest";

const fallbackMessages: Record<AuthAction, string> = {
  login: "No pudimos iniciar sesión. Revisa tus datos e inténtalo otra vez.",
  signup: "No pudimos crear la cuenta. Inténtalo otra vez en unos minutos.",
  recovery: "No pudimos enviar el enlace. Inténtalo otra vez en unos minutos.",
  password: "No pudimos actualizar la contraseña. Solicita un enlace nuevo.",
  profile: "No pudimos guardar tus datos. Inténtalo otra vez.",
  guest: "No pudimos preparar el pedido como invitado. Inténtalo otra vez.",
};

export function getCustomerAuthMessage(error: unknown, action: AuthAction) {
  if (error && typeof error === "object" && "code" in error) {
    const code = String(error.code);

    if (code === "invalid_credentials") {
      return "El correo o la contraseña no son correctos.";
    }

    if (code === "email_not_confirmed") {
      return "Primero confirma tu correo desde el enlace que te enviamos.";
    }

    if (code === "user_already_exists" || code === "email_exists") {
      return "Ya existe una cuenta con este correo. Intenta ingresar.";
    }

    if (code === "weak_password") {
      return "Usa una contraseña de al menos 8 caracteres.";
    }

    if (code === "over_request_rate_limit") {
      return "Hiciste varios intentos. Espera unos minutos antes de continuar.";
    }

    if (code === "captcha_failed") {
      return "No se pudo completar la verificación de seguridad. Inténtalo otra vez.";
    }
  }

  return fallbackMessages[action];
}
