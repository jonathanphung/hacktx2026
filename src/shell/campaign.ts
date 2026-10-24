import { getCampaign, setCampaign, type Campaign } from "../shared/campaign";
let loading: Promise<Campaign> | undefined;
export function loadCampaign(): Promise<Campaign> {
  return (loading ??= fetch(`${import.meta.env.BASE_URL}campaign.json`, {
    signal: AbortSignal.timeout(2500),
  })
    .then((response) => {
      if (!response.ok) throw new Error("Saved adventure unavailable");
      return response.json();
    })
    .then(setCampaign)
    .catch(() => getCampaign()));
}
