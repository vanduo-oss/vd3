export interface AuthProvider {
  id: string;
  label: string;
  icon?: string;
}

export interface LoginSubmit {
  identifier: string;
  password: string;
  remember: boolean;
}

export interface SignUpSubmit {
  name: string;
  email: string;
  password: string;
  terms: boolean;
}

export interface ForgotPasswordSubmit {
  email: string;
}
