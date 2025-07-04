
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

  // If user has no memberships at all, they will see a specific message on the form.
  if (!user.isReferee && !user.isAdmin) {
     redirect('/register'); // Should not happen if logged in, but as a fallback.
  }


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
