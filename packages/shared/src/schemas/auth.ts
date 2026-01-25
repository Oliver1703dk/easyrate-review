import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Ugyldig email adresse'),
  password: z.string().min(8, 'Adgangskode skal være mindst 8 tegn'),
  name: z.string().min(1, 'Navn er påkrævet').max(255),
  businessName: z.string().min(1, 'Virksomhedsnavn er påkrævet').max(255),
});

export const loginSchema = z.object({
  email: z.string().email('Ugyldig email adresse'),
  password: z.string().min(1, 'Adgangskode er påkrævet'),
});

export type RegisterSchema = z.infer<typeof registerSchema>;
export type LoginSchema = z.infer<typeof loginSchema>;
