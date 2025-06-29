
import { getUserFromSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { UserCog, KeyRound, Mail, Shield, User as UserIcon } from "lucide-react";
import ChangePasswordForm from "@/components/account/change-password-form";
import type { Metadata } from 'next';
import { getAccountPageData } from "@/lib/actions";
import UserStats from "@/components/account/user-stats";

export const metadata: Metadata = {
  title: 'Mi Cuenta',
  description: 'Gestiona la configuración de tu cuenta, tus datos y estadísticas.',
};

export default async function AccountPage() {
    const sessionUser = await getUserFromSession();
    if (!sessionUser) {
        redirect('/login');
    }

    const { user, stats } = await getAccountPageData(sessionUser.id);
    
    if (!user) {
        redirect('/login');
    }

    return (
        <div className="space-y-8">
            <Card className="w-full mx-auto shadow-xl">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline flex items-center gap-3">
                        <UserCog className="text-primary h-8 w-8"/>
                        Mi Cuenta
                    </CardTitle>
                    <CardDescription>
                        Gestiona tu información personal, estadísticas y seguridad de la cuenta.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="p-4 border rounded-lg bg-muted/40">
                        <h3 className="font-semibold text-lg mb-3">Información del Usuario</h3>
                        <div className="space-y-2 text-sm">
                            <p className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-muted-foreground" /> <strong>Nombre:</strong> {user.name}</p>
                            <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> <strong>Email:</strong> {user.email}</p>
                            <p className="flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" /> <strong>Rol:</strong> <span className="capitalize">{user.role === 'admin' ? 'Administrador' : 'Árbitro'}</span></p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {user.role === 'referee' && stats && <UserStats stats={stats} />}
            
            <Card className="w-full mx-auto shadow-xl">
                <CardHeader>
                    <CardTitle className="text-xl font-headline flex items-center gap-2">
                        <KeyRound className="text-primary"/>
                        Cambiar Contraseña
                    </CardTitle>
                     <CardDescription>
                        Actualiza tu contraseña para mantener tu cuenta segura.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   <ChangePasswordForm />
                </CardContent>
            </Card>
        </div>
    )
}
