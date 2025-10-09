import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { teamApi } from "@/lib/api";
import { User, Mail, Coins, Save, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

export function AccountPage() {
  const { team, refreshTeamProfile } = useAuth();
  const [email, setEmail] = useState(team?.email || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const { showToast } = useToast();

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || email === team?.email) {
      showToast({ message: "Please enter a different email", type: "warning" });
      return;
    }

    setIsUpdating(true);
    try {
      await teamApi.updateProfile(email);
      await refreshTeamProfile();
      showToast({ message: "Email updated successfully!", type: "success" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update email";
      showToast({
        message,
        type: "error",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!team) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Paramètres du compte
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team Information Card */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Informations sur l'équipe</span>
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Nom de l'équipe
                </label>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {team.name}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  ID de l'équipe
                </label>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  #{team.id}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Dernière activité
                </label>
                <p className="text-sm text-gray-700 mt-1">
                  {new Date(team.last_activity).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Credits Card */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold flex items-center space-x-2">
                <Coins className="w-5 h-5 text-yellow-600" />
                <span>Solde des crédits</span>
              </h2>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6 border border-yellow-200">
                <p className="text-sm text-gray-600 mb-2">
                  Crédits disponibles
                </p>
                <div className="flex items-center space-x-2">
                  <Coins className="w-8 h-8 text-yellow-600" />
                  <span className="text-4xl font-bold text-gray-900">
                    {team.credit}
                  </span>
                  <span className="text-lg text-gray-600">coins</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Update Email Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <h2 className="text-xl font-semibold flex items-center space-x-2">
                <Mail className="w-5 h-5" />
                <span>Mettre à jour l'adresse e-mail</span>
              </h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateEmail} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Adresse e-mail actuelle
                  </label>
                  <p className="text-gray-600 mb-4">{team.email}</p>

                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Nouvelle adresse e-mail
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter new email address"
                    required
                    className="max-w-md"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isUpdating || email === team.email}
                  className="flex items-center space-x-2"
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>En cours de mise à jour...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Mettre à jour l'e-mail</span>
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
