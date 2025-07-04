
import AvailabilityForm from "@/components/user/availability-form";
import { getAvailabilityFormData } from "@/lib/actions";
import { getUserFromSession } from "@/lib/session";
import { redirect } from "next/navigation";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Disponibilidad de Árbitro',
  description: 'Envía o edita tu disponibilidad para los próximos partidos de tu asociación.',
};

export default async function UserPage() {
  const user = await getUserFromSession();
  
  if (!user) {
    redirect('/login');
  }

  // The form itself will handle the case where a user has no memberships.
  // No need to redirect them away from their main page.

  const formData = await getAvailabilityFormData(user.id);

  if (!formData) {
     return (
      <div className="flex flex-col items-center justify-center py-2">
        <AvailabilityForm initialData={null} user={user} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <AvailabilityForm initialData={formData} user={user} />
    </div>
  );
}
