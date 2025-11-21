import { Users } from "./../users.ts";

export interface LoginResponse {
    users: Pick<Users, 'id' | 'email' | 'display_name'>;
}

export interface SignupResponse {

}