
import { getUserFromSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { UserCog } from "lucide-react";
import ChangePasswordForm from "@/components/account/change-password-form";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mi Cuenta',
  description: 'Gestiona la configuración de tu cuenta y tu seguridad.',
};

export default async function AccountPage() {
    const user = await getUserFromSession();
    if (!user) {
        redirect('/login');
    }

    return (
        <div className="flex flex-col items-center justify-center py-12">
            <Card className="w-full max-w-md mx-auto shadow-xl">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline flex items-center gap-2">
                        <UserCog className="text-primary"/>
                        Mi Cuenta
                    </CardTitle>
                    <CardDescription>
                        Gestiona la información de tu cuenta y tu seguridad.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   <ChangePasswordForm />
                </CardContent>
            </Card>
        </div>
    )
}
