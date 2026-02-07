import { Card, CardContent, CardHeader, CardTitle } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import { Header } from '../../components/dashboard/layout';
import { TestLinkCard, TestOrderCard } from '../../components/dashboard/test';
import { useAuth } from '../../contexts/AuthContext';

export function TestPage() {
  const { business } = useAuth();

  if (!business) {
    return null;
  }

  const instructions = [
    DASHBOARD_TEXT.test.instruction1,
    DASHBOARD_TEXT.test.instruction2,
    DASHBOARD_TEXT.test.instruction3,
    DASHBOARD_TEXT.test.instruction4,
  ];

  return (
    <div className="flex flex-col">
      <Header title={DASHBOARD_TEXT.test.title} />

      <div className="p-6">
        <p className="mb-6 text-muted-foreground">{DASHBOARD_TEXT.test.subtitle}</p>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* New: Send real test messages */}
          <TestOrderCard />

          {/* Existing: Generate test link only */}
          <TestLinkCard businessId={business.id} />
        </div>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{DASHBOARD_TEXT.test.instructionsTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
                {instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
