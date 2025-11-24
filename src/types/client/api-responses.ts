import { Users } from "./../users.js";

export interface LoginResponse {
    users: Pick<Users, 'id' | 'email' | 'display_name'>;
}

export interface SignupResponse {

}