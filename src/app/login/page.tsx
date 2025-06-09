
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LogIn } from "lucide-react";
import { findUserByEmail, setCurrentUserEmail, setActiveClubId } from "@/lib/localStorage";
import { useRouter } from "next/navigation";

const loginFormSchema = z.object({
  email: z.string().email({ message: "Por favor, introduce un correo electrónico válido." }),
  password: z.string().min(1, { message: "La contraseña no puede estar vacía." }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(data: LoginFormValues) {
    const user = findUserByEmail(data.email);

    if (user && user.password === data.password) { // VERY INSECURE: for demo only
      setCurrentUserEmail(user.email);
      
      if (user.role === 'admin' && user.administeredClubId) {
        setActiveClubId(user.administeredClubId); // Admin operates on their administered club
        router.push('/admin');
      } else if (user.role === 'referee' && user.memberClubIds && user.memberClubIds.length > 0) {
        // For referees, default to the first club in their list.
        // A dedicated club selection UI would be better for multiple clubs.
        setActiveClubId(user.memberClubIds[0]); 
        router.push('/');
      } else if (user.role === 'referee' && (!user.memberClubIds || user.memberClubIds.length === 0)) {
         toast({
            title: "Error de Configuración",
            description: "Este árbitro no está asociado a ningún club.",
            variant: "destructive",
          });
         setCurrentUserEmail(null); // Log out user
         return;
      }
       else {
        // Fallback or error if user role/club setup is unexpected
        toast({
          title: "Error de Configuración",
          description: "No se pudo determinar tu rol o club. Contacta al soporte.",
          variant: "destructive",
        });
        setCurrentUserEmail(null); // Log out user
        return;
      }
      
      toast({
        title: "Inicio de Sesión Exitoso",
        description: `Bienvenido de nuevo, ${user.name}!`,
      });

    } else {
      toast({
        title: "Error de Inicio de Sesión",
        description: "Correo electrónico o contraseña incorrectos.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center gap-2">
            <LogIn className="text-primary" />
            Iniciar Sesión
          </CardTitle>
          <CardDescription>
            Accede a tu cuenta para gestionar turnos o registrar tu disponibilidad.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                <LogIn className="mr-2 h-4 w-4" />
                Acceder
              </Button>
            </form>
          </Form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿No tienes una cuenta?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
