// Autenticação com Google OAuth 2.0 (Google Identity Services)
// + Modo Convidado / Demonstração

export class GoogleAuthManager {
  constructor() {
    this.clientId = localStorage.getItem('mary_google_client_id') || '';
    this.currentUser = null;
    this.onLoginSuccess = null;
  }

  init(onSuccess) {
    this.onLoginSuccess = onSuccess;

    // Verifica se já existia uma sessão salva
    const savedUser = localStorage.getItem('mary_user_session');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
        if (this.currentUser.name === 'Tony Stark' || !this.currentUser.name) {
          this.currentUser.name = 'Rafa';
          this.saveSession(this.currentUser);
        }
        if (this.onLoginSuccess) this.onLoginSuccess(this.currentUser);
        return;
      } catch (e) {
        localStorage.removeItem('mary_user_session');
      }
    }

    // Inicializa o Google Identity Services se houver Client ID ou quando o script carregar
    this.setupGoogleButton();
  }

  setClientId(newId) {
    this.clientId = newId;
    localStorage.setItem('mary_google_client_id', newId);
    this.setupGoogleButton();
  }

  setupGoogleButton() {
    const container = document.getElementById('google-signin-btn-container');
    if (!container) return;

    if (window.google && window.google.accounts && this.clientId) {
      try {
        window.google.accounts.id.initialize({
          client_id: this.clientId,
          callback: (response) => this.handleCredentialResponse(response)
        });

        window.google.accounts.id.renderButton(container, {
          theme: 'filled_black',
          size: 'large',
          text: 'signin_with',
          shape: 'pill'
        });
      } catch (err) {
        console.warn("Falha ao inicializar Google Sign-In:", err);
      }
    } else {
      // Se não tiver Client ID configurado ainda, instrui o botão com estilo
      container.innerHTML = `
        <div style="font-size: 11px; color: #6c8ca6; font-family: var(--font-data); padding: 6px;">
          [ Google OAuth aguardando Client ID nas Configurações ⚙️ ]
        </div>
      `;
    }
  }

  handleCredentialResponse(response) {
    try {
      // Decodifica o JWT retornado pelo Google
      const payload = this.decodeJwt(response.credential);
      const user = {
        name: payload.name || 'Operador Stark',
        email: payload.email,
        picture: payload.picture || 'https://lh3.googleusercontent.com/a/default-user'
      };

      this.saveSession(user);
    } catch (e) {
      console.error("Erro ao decodificar token do Google:", e);
    }
  }

  // Acesso rápido de teste
  loginAsGuest() {
    const guestUser = {
      name: 'Rafa',
      email: 'rafa@mary-system.local',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces'
    };
    this.saveSession(guestUser);
  }

  saveSession(user) {
    this.currentUser = user;
    localStorage.setItem('mary_user_session', JSON.stringify(user));
    if (this.onLoginSuccess) this.onLoginSuccess(user);
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('mary_user_session');
    if (window.google && window.google.accounts) {
      window.google.accounts.id.disableAutoSelect();
    }
    window.location.reload();
  }

  decodeJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  }
}

export const googleAuth = new GoogleAuthManager();
