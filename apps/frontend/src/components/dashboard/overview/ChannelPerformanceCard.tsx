import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';

interface ChannelData {
  channel: string;
  sent: number;
  opened: number;
  reviews: number;
  conversion: number;
}

interface ChannelPerformanceCardProps {
  emailData: ChannelData;
  smsData: ChannelData;
}

export function ChannelPerformanceCard({ emailData, smsData }: ChannelPerformanceCardProps) {
  const rows = [emailData, smsData];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{DASHBOARD_TEXT.overview.channelPerformance}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24"></TableHead>
              <TableHead className="text-right">{DASHBOARD_TEXT.overview.sent}</TableHead>
              <TableHead className="text-right">{DASHBOARD_TEXT.overview.opened}</TableHead>
              <TableHead className="text-right">{DASHBOARD_TEXT.overview.reviews}</TableHead>
              <TableHead className="text-right">{DASHBOARD_TEXT.overview.conversion}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.channel}>
                <TableCell className="font-medium">{row.channel}</TableCell>
                <TableCell className="text-right">{row.sent}</TableCell>
                <TableCell className="text-right">{row.opened}</TableCell>
                <TableCell className="text-right">{row.reviews}</TableCell>
                <TableCell className="text-right">{row.conversion}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
