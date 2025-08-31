import { notFound } from 'next/navigation';
import { AuthLayout } from '@/components/auth/auth-layout';
import { SocialProfileForm } from '@/components/auth/social-profile-form';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isValidLocale } from '@/lib/i18n/utils';
import type { Locale } from '@/lib/i18n/types';

interface CompleteProfilePageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function CompleteProfilePage({ 
  params
}: CompleteProfilePageProps) {
  const { locale } = await params;
  
  // Validate locale
  if (!isValidLocale(locale)) {
    notFound();
  }
  
  const validatedLocale = locale as Locale;
  const dict = await getDictionary(validatedLocale);

  return (
    <AuthLayout locale={validatedLocale}>
      <SocialProfileForm 
        dict={dict} 
        locale={validatedLocale}
      />
    </AuthLayout>
  );
}

export async function generateMetadata({ params }: CompleteProfilePageProps) {
  const { locale } = await params;
  
  if (!isValidLocale(locale)) {
    return {};
  }
  
  const validatedLocale = locale as Locale;
  const dict = await getDictionary(validatedLocale);

  return {
    title: dict.auth.profileCompletion,
    description: dict.auth.completeProfile,
  };
}
