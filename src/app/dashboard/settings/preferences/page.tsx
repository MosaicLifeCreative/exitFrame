"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { useChatContext } from "@/hooks/useChatContext";

// ─── Types ───────────────────────────────────────────────

interface ProfilePrefs {
  name: string;
  birthday: string;
  heightInches: string;
  gender: string;
}

interface HealthPrefs {
  weightCurrent: string;
  weightGoal: string;
  bodyFatGoal: string;
  bloodPressure: string;
  sleepTargetBedtime: string;
  sleepTargetWake: string;
  sleepTargetHours: string;
  dietPattern: string;
  alcoholStatus: string;
  caffeineIntake: string;
  bathingHabit: string;
  saunaFrequency: string;
}

interface FitnessPrefs {
  trainingModes: string;
  weeklyFrequency: string;
  workoutStyle: string;
  weakPoints: string;
  cardioSwimming: string;
  cardioRunning: string;
  cardioBiking: string;
  fitnessGoals: string;
}

interface LifestylePrefs {
  workSchedule: string;
  notes: string;
}

// ─── Defaults ────────────────────────────────────────────

const defaultProfile: ProfilePrefs = {
  name: "",
  birthday: "",
  heightInches: "",
  gender: "",
};

const defaultHealth: HealthPrefs = {
  weightCurrent: "",
  weightGoal: "",
  bodyFatGoal: "",
  bloodPressure: "",
  sleepTargetBedtime: "",
  sleepTargetWake: "",
  sleepTargetHours: "",
  dietPattern: "",
  alcoholStatus: "",
  caffeineIntake: "",
  bathingHabit: "",
  saunaFrequency: "",
};

const defaultFitness: FitnessPrefs = {
  trainingModes: "",
  weeklyFrequency: "",
  workoutStyle: "",
  weakPoints: "",
  cardioSwimming: "",
  cardioRunning: "",
  cardioBiking: "",
  fitnessGoals: "",
};

const defaultLifestyle: LifestylePrefs = {
  workSchedule: "",
  notes: "",
};

// ─── Page ────────────────────────────────────────────────

export default function PreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfilePrefs>(defaultProfile);
  const [health, setHealth] = useState<HealthPrefs>(defaultHealth);
  const [fitness, setFitness] = useState<FitnessPrefs>(defaultFitness);
  const [lifestyle, setLifestyle] = useState<LifestylePrefs>(defaultLifestyle);

  useChatContext("Settings", "User preferences and profile settings page");

  const loadPreferences = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/preferences");
      if (!res.ok) return;
      const json = await res.json();
      const data = json.data;

      if (data.profile) setProfile({ ...defaultProfile, ...data.profile });
      if (data.health) setHealth({ ...defaultHealth, ...data.health });
      if (data.fitness) setFitness({ ...defaultFitness, ...data.fitness });
      if (data.lifestyle) setLifestyle({ ...defaultLifestyle, ...data.lifestyle });
    } catch {
      toast.error("Failed to load preferences");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const saveCategory = async (category: string, data: ProfilePrefs | HealthPrefs | FitnessPrefs | LifestylePrefs) => {
    setSaving(category);
    try {
      const res = await fetch("/api/settings/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [category]: data }),
      });

      if (res.ok) {
        toast.success(`${category.charAt(0).toUpperCase() + category.slice(1)} saved`);
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Preferences</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your profile and preferences. Claude uses this context across all pages.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="fitness">Fitness</TabsTrigger>
          <TabsTrigger value="lifestyle">Lifestyle</TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ── */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthday">Birthday</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={profile.birthday}
                    onChange={(e) => setProfile({ ...profile, birthday: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (inches)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={profile.heightInches}
                    onChange={(e) => setProfile({ ...profile, heightInches: e.target.value })}
                    placeholder="71"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={profile.gender}
                    onValueChange={(v) => setProfile({ ...profile, gender: v })}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <SaveButton
                saving={saving === "profile"}
                onClick={() => saveCategory("profile", profile)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Health Tab ── */}
        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Health Targets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Body Composition */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Body Composition</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Current Weight (lbs)</Label>
                    <Input
                      type="number"
                      value={health.weightCurrent}
                      onChange={(e) => setHealth({ ...health, weightCurrent: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weight Goal (lbs)</Label>
                    <Input
                      type="number"
                      value={health.weightGoal}
                      onChange={(e) => setHealth({ ...health, weightGoal: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Body Fat Goal (%)</Label>
                    <Input
                      type="number"
                      value={health.bodyFatGoal}
                      onChange={(e) => setHealth({ ...health, bodyFatGoal: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Vitals */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Vitals</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Blood Pressure</Label>
                    <Input
                      value={health.bloodPressure}
                      onChange={(e) => setHealth({ ...health, bloodPressure: e.target.value })}
                      placeholder="120/80"
                    />
                  </div>
                </div>
              </div>

              {/* Sleep */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Sleep</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Target Bedtime</Label>
                    <Input
                      type="time"
                      value={health.sleepTargetBedtime}
                      onChange={(e) => setHealth({ ...health, sleepTargetBedtime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Wake Time</Label>
                    <Input
                      type="time"
                      value={health.sleepTargetWake}
                      onChange={(e) => setHealth({ ...health, sleepTargetWake: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Duration</Label>
                    <Input
                      value={health.sleepTargetHours}
                      onChange={(e) => setHealth({ ...health, sleepTargetHours: e.target.value })}
                      placeholder="7-8 hrs"
                    />
                  </div>
                </div>
              </div>

              {/* Diet & Habits */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Diet & Habits</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Diet Pattern</Label>
                    <Textarea
                      value={health.dietPattern}
                      onChange={(e) => setHealth({ ...health, dietPattern: e.target.value })}
                      placeholder="Whole foods, no added sugars..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Alcohol Status</Label>
                    <Input
                      value={health.alcoholStatus}
                      onChange={(e) => setHealth({ ...health, alcoholStatus: e.target.value })}
                      placeholder="None since..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Caffeine</Label>
                    <Input
                      value={health.caffeineIntake}
                      onChange={(e) => setHealth({ ...health, caffeineIntake: e.target.value })}
                      placeholder="2 cups/day, black coffee"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sauna Frequency</Label>
                    <Input
                      value={health.saunaFrequency}
                      onChange={(e) => setHealth({ ...health, saunaFrequency: e.target.value })}
                      placeholder="3x/week, 20-25 min"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bathing Habits</Label>
                    <Input
                      value={health.bathingHabit}
                      onChange={(e) => setHealth({ ...health, bathingHabit: e.target.value })}
                      placeholder="Cold showers..."
                    />
                  </div>
                </div>
              </div>

              <SaveButton
                saving={saving === "health"}
                onClick={() => saveCategory("health", health)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Fitness Tab ── */}
        <TabsContent value="fitness">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fitness Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* General */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Training</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Training Modes</Label>
                    <Input
                      value={fitness.trainingModes}
                      onChange={(e) => setFitness({ ...fitness, trainingModes: e.target.value })}
                      placeholder="Swim, Lift, Bike"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weekly Frequency</Label>
                    <Input
                      value={fitness.weeklyFrequency}
                      onChange={(e) => setFitness({ ...fitness, weeklyFrequency: e.target.value })}
                      placeholder="2-3x lifting, 3x swim"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Workout Style</Label>
                    <Input
                      value={fitness.workoutStyle}
                      onChange={(e) => setFitness({ ...fitness, workoutStyle: e.target.value })}
                      placeholder="Full Body"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weak Points / Focus Areas</Label>
                    <Input
                      value={fitness.weakPoints}
                      onChange={(e) => setFitness({ ...fitness, weakPoints: e.target.value })}
                      placeholder="Core stability, shoulder mobility..."
                    />
                  </div>
                </div>
              </div>

              {/* Cardio */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Cardio Details</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>Swimming</Label>
                    <Textarea
                      value={fitness.cardioSwimming}
                      onChange={(e) => setFitness({ ...fitness, cardioSwimming: e.target.value })}
                      placeholder="Distance per session, strokes, goals, what needs work..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Running</Label>
                    <Input
                      value={fitness.cardioRunning}
                      onChange={(e) => setFitness({ ...fitness, cardioRunning: e.target.value })}
                      placeholder="Occasional, distance, pace..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Biking</Label>
                    <Input
                      value={fitness.cardioBiking}
                      onChange={(e) => setFitness({ ...fitness, cardioBiking: e.target.value })}
                      placeholder="Road, mountain, frequency..."
                    />
                  </div>
                </div>
              </div>

              {/* Goals */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Fitness Goals</h3>
                <div className="space-y-2">
                  <Textarea
                    value={fitness.fitnessGoals}
                    onChange={(e) => setFitness({ ...fitness, fitnessGoals: e.target.value })}
                    placeholder="Strength targets, body composition, conditioning goals..."
                    rows={3}
                  />
                </div>
              </div>

              <SaveButton
                saving={saving === "fitness"}
                onClick={() => saveCategory("fitness", fitness)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Lifestyle Tab ── */}
        <TabsContent value="lifestyle">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lifestyle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Work Schedule</Label>
                <Input
                  value={lifestyle.workSchedule}
                  onChange={(e) => setLifestyle({ ...lifestyle, workSchedule: e.target.value })}
                  placeholder="Remote, flexible hours..."
                />
              </div>
              <div className="space-y-2">
                <Label>Additional Notes for Claude</Label>
                <Textarea
                  value={lifestyle.notes}
                  onChange={(e) => setLifestyle({ ...lifestyle, notes: e.target.value })}
                  placeholder="Anything else Claude should know about you..."
                  rows={4}
                />
              </div>
              <SaveButton
                saving={saving === "lifestyle"}
                onClick={() => saveCategory("lifestyle", lifestyle)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <div className="flex justify-end pt-2">
      <Button onClick={onClick} disabled={saving} size="sm">
        {saving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
