import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/affiliate/PageHeader";
import { CopyButton } from "@/components/affiliate/CopyButton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useBankDetails, useSaveBankDetails } from "@/hooks/useAffiliate";
import { getBackend } from "@/lib/data";
import { bankDetailsSchema, type BankDetailsValues } from "@/lib/affiliate/validation";

export default function AffiliateProfile() {
  const { profile, refresh } = useAuth();
  const { data: bank, isLoading } = useBankDetails(profile?.id);
  const saveBank = useSaveBankDetails();
  const [savingProfile, setSavingProfile] = useState(false);
  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");

  const form = useForm<BankDetailsValues>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: { accountHolderName: "", bankName: "", accountNumber: "", ifscCode: "", upiId: "" },
  });

  useEffect(() => {
    if (bank) {
      form.reset({
        accountHolderName: bank.accountHolderName,
        bankName: bank.bankName,
        accountNumber: bank.accountNumber,
        ifscCode: bank.ifscCode,
        upiId: bank.upiId,
      });
    }
  }, [bank, form]);

  useEffect(() => {
    setFullName(profile?.fullName ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  const onSaveBank = async (values: BankDetailsValues) => {
    if (!profile) return;
    try {
      await saveBank.mutateAsync({ userId: profile.id, values });
      toast.success("Payout details saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the payout details");
    }
  };

  const onSaveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    try {
      await getBackend().updateProfile(profile.id, { fullName, phone });
      await refresh();
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the profile");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Payout details" description="Where your commissions are transferred, and who you are." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your details</CardTitle>
          <CardDescription>Your referral code identifies you across the whole program.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full name</Label>
              <Input id="full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (WhatsApp)</Label>
              <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email ?? ""} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label>Referral code</Label>
              <div className="flex gap-2">
                <Input value={profile?.referralCode ?? ""} readOnly className="font-mono" />
                <CopyButton value={profile?.referralCode ?? ""} />
              </div>
            </div>
          </div>
          <Button onClick={onSaveProfile} disabled={savingProfile}>
            {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bank account for payouts</CardTitle>
          <CardDescription>
            The admin transfers your cleared commissions to this account manually and records the reference.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <form onSubmit={form.handleSubmit(onSaveBank)} className="space-y-4" noValidate>
              {!bank?.accountNumber ? (
                <Alert>
                  <AlertDescription>
                    Add your bank details so your commissions can be transferred without a delay.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="accountHolderName">Account holder name</Label>
                <Input id="accountHolderName" {...form.register("accountHolderName")} />
                {form.formState.errors.accountHolderName ? (
                  <p className="text-sm text-destructive">{form.formState.errors.accountHolderName.message}</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank name</Label>
                  <Input id="bankName" {...form.register("bankName")} />
                  {form.formState.errors.bankName ? (
                    <p className="text-sm text-destructive">{form.formState.errors.bankName.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account number</Label>
                  <Input id="accountNumber" {...form.register("accountNumber")} />
                  {form.formState.errors.accountNumber ? (
                    <p className="text-sm text-destructive">{form.formState.errors.accountNumber.message}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ifscCode">IFSC code</Label>
                  <Input id="ifscCode" className="uppercase" {...form.register("ifscCode")} />
                  {form.formState.errors.ifscCode ? (
                    <p className="text-sm text-destructive">{form.formState.errors.ifscCode.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upiId">UPI ID (optional)</Label>
                  <Input id="upiId" {...form.register("upiId")} />
                  {form.formState.errors.upiId ? (
                    <p className="text-sm text-destructive">{form.formState.errors.upiId.message}</p>
                  ) : null}
                </div>
              </div>

              <Button type="submit" disabled={saveBank.isPending}>
                {saveBank.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save payout details
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
