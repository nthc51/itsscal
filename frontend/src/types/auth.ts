export interface User {
  user_id: string;
  full_name: string;
  email: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  full_name: string;
  email: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}