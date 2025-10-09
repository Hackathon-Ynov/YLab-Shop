import { useEffect, useState } from "react";
import { adminApi, TeamComposition } from "../../lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { useToast } from "../../components/ui/ToastProvider";
import AdminNavigation from "../../components/admin/AdminNavigation";

const DEPARTMENT_COLORS = {
  dev: "#3b82f6",
  infra: "#ef4444",
  data: "#10b981",
  iot: "#a855f7",
  sysemb: "#f97316",
};

const DEPARTMENT_LABELS = {
  dev: "Dev",
  infra: "Infra",
  data: "Data",
  iot: "IoT",
  sysemb: "SysEmb",
};

type Department = keyof typeof DEPARTMENT_COLORS;

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamComposition[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamComposition | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadTeams = async () => {
    try {
      const data = await adminApi.getAllTeamCompositions();
      setTeams(data);
      if (data.length > 0 && !selectedTeam) {
        setSelectedTeam(data[0]);
      }
    } catch (error) {
      console.error("Failed to load teams:", error);
      showToast({ message: "Failed to load teams", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleSlot = async (
    teamId: number,
    department: Department,
    action: "fill" | "empty"
  ) => {
    try {
      const updatedTeam = await adminApi.toggleTeamSlot(teamId, {
        department,
        action,
      });

      // Update teams list
      setTeams((prev) =>
        prev.map((t) => (t.id === updatedTeam.id ? updatedTeam : t))
      );

      // Update selected team if it's the one we modified
      if (selectedTeam?.id === updatedTeam.id) {
        setSelectedTeam(updatedTeam);
      }

      showToast({
        message: `${action === "fill" ? "Filled" : "Emptied"} slot for ${
          DEPARTMENT_LABELS[department]
        }`,
        type: "success",
      });
    } catch (error) {
      console.error("Failed to toggle slot:", error);
      showToast({ message: "Failed to update slot", type: "error" });
    }
  };

  const renderDepartmentCircles = (team: TeamComposition) => {
    const circles: React.ReactElement[] = [];
    const departments: Department[] = ["dev", "infra", "data", "iot", "sysemb"];

    departments.forEach((dept) => {
      const total = team[`${dept}_total` as keyof TeamComposition] as number;
      const filled = team[`${dept}_filled` as keyof TeamComposition] as number;

      for (let i = 0; i < total; i++) {
        const isFilled = i < filled;
        circles.push(
          <div
            key={`${dept}-${i}`}
            className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
              isFilled ? "" : "bg-transparent"
            }`}
            style={{
              borderColor: DEPARTMENT_COLORS[dept],
              backgroundColor: isFilled
                ? DEPARTMENT_COLORS[dept]
                : "transparent",
            }}
            title={`${DEPARTMENT_LABELS[dept]} - ${
              isFilled ? "Filled" : "Empty"
            }`}
          />
        );
      }
    });

    return circles;
  };

  if (loading) {
    return (
      <>
        <AdminNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading teams...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminNavigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Teams Management</h1>
          <p className="text-gray-600 mt-2">
            Manage team compositions and member slots
          </p>
        </div>

        <div className="flex h-[calc(100vh-280px)] gap-4">
          {/* Sidebar with team list */}
          <div className="w-80 flex-shrink-0 overflow-y-auto">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Teams Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                      selectedTeam?.id === team.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-semibold mb-2">{team.name}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {renderDepartmentCircles(team)}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Total:{" "}
                      {team.dev_total +
                        team.infra_total +
                        team.data_total +
                        team.iot_total +
                        team.sysemb_total}{" "}
                      slots
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main content - team details */}
          <div className="flex-1 overflow-y-auto">
            {selectedTeam ? (
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    {selectedTeam.name} - Composition
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    Click on filled circles (solid) to empty them, click on
                    empty circles (outlined) to fill them
                  </p>
                </CardHeader>
                <CardContent>
                  {/* All circles in one row */}
                  <div className="flex flex-wrap gap-3 p-6 bg-gray-50 rounded-lg">
                    {(Object.keys(DEPARTMENT_COLORS) as Department[]).map(
                      (dept) => {
                        const total = selectedTeam[
                          `${dept}_total` as keyof TeamComposition
                        ] as number;
                        const filled = selectedTeam[
                          `${dept}_filled` as keyof TeamComposition
                        ] as number;

                        return Array.from({ length: total }).map((_, i) => {
                          const isFilled = i < filled;
                          return (
                            <button
                              key={`${dept}-${i}`}
                              onClick={() =>
                                handleToggleSlot(
                                  selectedTeam.id,
                                  dept,
                                  isFilled ? "empty" : "fill"
                                )
                              }
                              className="w-16 h-16 rounded-full border-4 flex items-center justify-center font-semibold hover:scale-110 transition-transform cursor-pointer"
                              style={{
                                borderColor: DEPARTMENT_COLORS[dept],
                                backgroundColor: isFilled
                                  ? DEPARTMENT_COLORS[dept]
                                  : "transparent",
                                color: isFilled
                                  ? "white"
                                  : DEPARTMENT_COLORS[dept],
                              }}
                              title={`${DEPARTMENT_LABELS[dept]} - Click to ${
                                isFilled ? "empty" : "fill"
                              }`}
                            >
                              {i + 1}
                            </button>
                          );
                        });
                      }
                    )}
                  </div>

                  {/* Summary */}
                  <div className="mt-8 p-6 bg-white border rounded-lg">
                    <h3 className="font-semibold text-lg mb-4">Team Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {(Object.keys(DEPARTMENT_COLORS) as Department[]).map(
                        (dept) => {
                          const total = selectedTeam[
                            `${dept}_total` as keyof TeamComposition
                          ] as number;
                          const filled = selectedTeam[
                            `${dept}_filled` as keyof TeamComposition
                          ] as number;
                          return (
                            <div key={dept} className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{
                                  backgroundColor: DEPARTMENT_COLORS[dept],
                                }}
                              />
                              <span className="font-medium">
                                {DEPARTMENT_LABELS[dept]}:
                              </span>
                              <span
                                className={
                                  filled === total
                                    ? "text-green-600 font-semibold"
                                    : ""
                                }
                              >
                                {filled}/{total}
                              </span>
                            </div>
                          );
                        }
                      )}
                      <div className="col-span-2 md:col-span-3 border-t pt-3 mt-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-lg">
                              Total Filled:{" "}
                            </span>
                            <span className="text-lg">
                              {selectedTeam.dev_filled +
                                selectedTeam.infra_filled +
                                selectedTeam.data_filled +
                                selectedTeam.iot_filled +
                                selectedTeam.sysemb_filled}
                              /
                              {selectedTeam.dev_total +
                                selectedTeam.infra_total +
                                selectedTeam.data_total +
                                selectedTeam.iot_total +
                                selectedTeam.sysemb_total}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {Math.round(
                              ((selectedTeam.dev_filled +
                                selectedTeam.infra_filled +
                                selectedTeam.data_filled +
                                selectedTeam.iot_filled +
                                selectedTeam.sysemb_filled) /
                                (selectedTeam.dev_total +
                                  selectedTeam.infra_total +
                                  selectedTeam.data_total +
                                  selectedTeam.iot_total +
                                  selectedTeam.sysemb_total)) *
                                100
                            )}
                            % complete
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent>
                  <p className="text-gray-500">Select a team to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
