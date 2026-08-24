import type { UserRepository } from "../domain/contracts";
export interface AuthModuleDependencies {
  userRepository: UserRepository;
  jwtSecret: string;
}
