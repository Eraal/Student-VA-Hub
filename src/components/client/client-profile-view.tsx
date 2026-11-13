"use client";

import * as React from "react";
import { Role } from "@prisma/client";
import { ProfileHeaderCard } from "@/components/profile/profile-header-card";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { PasswordCard } from "@/components/profile/password-card";
import { ClientProfileForm } from "@/components/client/client-profile-form";
import {
  LinkStudentCard,
  ClientLinkedStudentData,
} from "@/components/client/link-student-card";
import { updateClientProfileAction } from "@/lib/actions/profile";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface ClientProfileViewProps {
  initialUser: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
  initialLink: ClientLinkedStudentData | null;
}

export function ClientProfileView({
  initialUser,
  initialLink,
}: ClientProfileViewProps) {
  const [profileData, setProfileData] = React.useState({
    name: initialUser.name,
    email: initialUser.email,
  });

  const [linkData, setLinkData] = React.useState<ClientLinkedStudentData | null>(
    initialLink
  );

  const handleUpdatePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    return await updateClientProfileAction({
      name: profileData.name,
      email: profileData.email,
      currentPassword,
      newPassword,
      confirmPassword,
    });
  };

  return (
    <PageContainer>
      {/* Visually hidden h1 for accessibility & screen readers */}
      <PageHeader title="Profile" srOnlyTitle />

      {/* 1. Header Card (compact, ~96px height) */}
      <ProfileHeaderCard
        name={profileData.name}
        role={Role.CLIENT}
        email={profileData.email}
      />

      {/* 2. Main 2-column balanced grid on desktop, ordered stack on mobile:
          Mobile order: 1. Header, 2. Linked student card, 3. Personal details, 4. Password, 5. Log out
      */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Right column on desktop, but rendered 1st after header on mobile (order-1 lg:order-2) */}
        <div className="order-1 lg:order-2 space-y-6 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          <LinkStudentCard
            initialLink={linkData}
            onLinkUpdated={(updated) => setLinkData(updated)}
          />
        </div>

        {/* Left column on desktop, rendered 2nd on mobile (order-2 lg:order-1) */}
        <div className="order-2 lg:order-1 space-y-6">
          <ClientProfileForm
            initialData={{
              id: initialUser.id,
              name: profileData.name,
              email: profileData.email,
            }}
            onProfileSaved={(updated) => {
              setProfileData(updated);
            }}
          />

          <PasswordCard onUpdatePassword={handleUpdatePassword} />
        </div>
      </div>

      {/* Mobile-only Log Out ghost button at the very bottom of the page */}
      <div className="sm:hidden pt-2">
        <form action={logoutAction} className="w-full">
          <Button
            type="submit"
            variant="ghost"
            data-testid="logout-button"
            className="w-full text-slate-700 hover:text-[#0F172A] hover:bg-[#EFEAE2] font-semibold min-h-[44px]"
          >
            <LogOut className="size-4" />
            <span>Log out</span>
          </Button>
        </form>
      </div>
    </PageContainer>
  );
}
