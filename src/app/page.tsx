
import AvailabilityForm from "@/components/user/availability-form";
import { getAvailabilityFormData } from "@/lib/actions";
import { getUserFromSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function UserPage() {
  const user = await getUserFromSession();
  
  if (!user) {
    redirect('/login');
  }

  // Redirect admin users away from the referee-specific page
  if (user.role === 'admin') {
    redirect('/admin');
  }

  const formData = await getAvailabilityFormData(user.id);

  if (!formData) {
    // This can happen if a referee is not part of any club.
    // The component will handle displaying the appropriate message.
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
