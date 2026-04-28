import PageHeader from "../Shared/PageHeader";
import { AlertTriangleIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { getPostSnapshotsBytesInUse } from "@/shared/storage/post-snapshot-storage";

type TechnicalInfo = {
  extensionId: string;
  installType: string;
  version: string;
  versionName: string;
  snapshotStorageBytesInUse: number;
  totalStorageBytesInUse: number;
};
async function getTechnicalInfo(): Promise<TechnicalInfo> {
  const extInfo = await browser.management.getSelf();
  const snapshotStorageBytesInUse = await getPostSnapshotsBytesInUse();
  const totalStorageBytesInUse =
    await browser.storage.local.getBytesInUse(null);
  return {
    extensionId: extInfo.id,
    installType: extInfo.installType,
    version: extInfo.version,
    versionName: extInfo.versionName || "",
    snapshotStorageBytesInUse,
    totalStorageBytesInUse,
  };
}

function ContactSupport() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["extinfo"],
    queryFn: getTechnicalInfo,
  });

  return (
    <main className="p-4 flex flex-col gap-6  items-start">
      <PageHeader title="Signaler un problème" />
      <Card>
        <CardTitle>Comment signaler mon problème</CardTitle>
        <CardContent>
          <p>
            Pour signaler ton problème technique tu peux envoyer un email à
            &nbsp;<code>bth-devs[at]googlegroups.com </code>
            <a
              href="https://github.com/dataforgoodfr/14_BalanceTesHaters/issues/new"
              target="_blank"
              rel="noreferrer noopener"
              className="hover:underline"
            >
              ou créer une issue github
            </a>
            .
          </p>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardTitle>Informations technique</CardTitle>
        <CardContent className="text-left">
          {isLoading && <Spinner />}
          {isError && (
            <>
              <AlertTriangleIcon />
              Erreur {error.message}
            </>
          )}
          {data && (
            <>
              ID extension: {data.extensionId}
              <br />
              Version: {data.version}{" "}
              {data.versionName && <>({data.versionName})</>}
              <br />
              Type d&apos;installation: {data.installType}
              <br />
              Stockage snapshots:{" "}
              {Math.round((data.snapshotStorageBytesInUse || 0) / 1024)}
              kb
              <br />
              Stockage total:{" "}
              {Math.round((data.totalStorageBytesInUse || 0) / 1024)}kb
              <br />
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default ContactSupport;
