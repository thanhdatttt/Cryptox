export interface User { id: string; email: string; passwordHash: string; createdAt: string; }
export interface UserRepository { insert(user: User): Promise<void>; findByEmail(email: string): Promise<User | undefined>; findById(id: string): Promise<User | undefined>; }
