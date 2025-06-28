
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, ShieldCheck, Briefcase, Eye, EyeOff } from "lucide-react";
import { useState, useTransition } from "react";
import { registerUser } from "@/lib/actions";

const registerFormSchemaBase = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor, introduce un correo electrónico válido." }),
  password: z.string()
    .min(6, { message: "La contraseña debe tener al menos 6 caracteres." })
    .regex(/^(?=.*[a-zA-Z])(?=.*\d).*$/, { message: "La contraseña debe contener al menos una letra y un número." }),
  confirmPassword: z.string(),
  role: z.enum(["admin", "referee"], { required_error: "Debes seleccionar un rol." }),
});

const registerFormSchema = registerFormSchemaBase.extend({
  clubName: z.string().optional(),
  clubIdToJoin: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.role === "admin") {
    return !!data.clubName && data.clubName.length >= 3;
  }
  return true;
}, {
  message: "El nombre de la asociación debe tener al menos 3 caracteres.",
  path: ["clubName"],
}).refine((data) => {
  if (data.role === "referee") {
    return !!data.clubIdToJoin && data.clubIdToJoin.length > 0;
  }
  return true;
}, {
  message: "El código de asociación es requerido para árbitros.",
  path: ["clubIdToJoin"],
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function RegisterPage() {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<'admin' | 'referee' | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: undefined,
      clubName: "",
      clubIdToJoin: "",
    },
  });

  async function onSubmit(data: RegisterFormValues) {
    startTransition(async () => {
      const result = await registerUser(data);
      if (result?.error) {
        toast({
          title: "Error de Registro",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-lg mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center gap-2">
            <UserPlus className="text-primary" />
            Crear Cuenta
          </CardTitle>
          <CardDescription>
            Regístrate como administrador de asociación o como árbitro para unirte a una asociación existente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Quiero registrarme como:</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value: 'admin' | 'referee') => {
                          field.onChange(value);
                          setSelectedRole(value);
                          form.setValue("clubName", "");
                          form.setValue("clubIdToJoin", "");
                          form.clearErrors("clubName");
                          form.clearErrors("clubIdToJoin");
                        }}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2 sm:flex-row sm:space-x-4 sm:space-y-0"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="admin" />
                          </FormControl>
                          <FormLabel className="font-normal flex items-center gap-1"><ShieldCheck size={18}/> Administrador de Asociación</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="referee" />
                          </FormControl>
                          <FormLabel className="font-normal flex items-center gap-1"><Briefcase size={18}/> Árbitro</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedRole === "admin" && (
                <FormField
                  control={form.control}
                  name="clubName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asociación a la que pertenece</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Liga Regional de Fútbol" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {selectedRole === "referee" && (
                <FormField
                  control={form.control}
                  name="clubIdToJoin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código de Asociación para Unirse</FormLabel>
                      <FormControl>
                        <Input placeholder="Ingresa el código proporcionado por el administrador" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Tu nombre completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="tu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                     <div className="relative">
                      <FormControl>
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                           className="pr-10"
                          {...field}
                        />
                      </FormControl>
                       <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-muted-foreground"
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Contraseña</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pr-10"
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-muted-foreground"
                        aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={!selectedRole || isPending}>
                <UserPlus className="mr-2 h-4 w-4" />
                {isPending ? 'Registrando...' : 'Registrarse'}
              </Button>
            </form>
          </Form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Inicia sesión aquí
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
