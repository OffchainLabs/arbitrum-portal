import { RaasProviderCard } from './RaasProviderCard';

export const RaasProviderGrid = () => {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <RaasProviderCard
        name="Caldera"
        description="Supports AnyTrust and Rollup chains"
        caption="Powering Treasure, Hychain, Rari"
        link="https://caldera.xyz/"
        logo="/images/Caldera.svg"
      />
      <RaasProviderCard
        name="Conduit"
        description="Supports AnyTrust and Rollup chains"
        caption="Powering Proof of Play and Gravity"
        link="https://conduit.xyz/"
        logo="/images/Conduit.svg"
      />
      <RaasProviderCard
        name="AltLayer"
        description="Supports AnyTrust chains"
        caption="Powering Cometh, Polychain Monster & Avive"
        link="https://altlayer.io/"
        logo="/images/AltLayer.svg"
      />
      <RaasProviderCard
        name="Gelato"
        description="Supports AnyTrust chains"
        caption="Powering re.al and Playnance"
        link="https://gelato.network/"
        logo="/images/Gelato.svg"
      />
      <RaasProviderCard
        name="Asphere"
        description="Supports AnyTrust and Rollup chains"
        caption="Powering Social Network and Destra"
        link="https://www.ankr.com/rollup-as-a-service-raas"
        logo="/images/AsphereLogo.png"
      />
      <RaasProviderCard
        name="Zeeve"
        description="Supports AnyTrust and Rollup chains"
        caption="Powering BlockFit and ZKasino"
        link="https://www.zeeve.io/"
        logo="/images/ZeeveLogo.png"
      />
      <RaasProviderCard
        name="Alchemy"
        description="Supports AnyTrust and Rollup chains"
        caption="Powering Aavegotchi"
        link="https://alchemy.com/rollups"
        logo="/images/AlchemyLogo.png"
      />
      <RaasProviderCard
        name="QuickNode"
        description="Supports AnyTrust and Rollup chains"
        caption="Powering Proof of Play"
        link="https://www.quicknode.com/rollup"
        logo="/images/QuickNodeLogo.svg"
      />
      <RaasProviderCard
        name="Gateway"
        description="Supports AnyTrust and Rollup chains"
        caption=""
        link="https://www.gateway.fm/"
        logo="/images/GatewayLogo.png"
      />
      <RaasProviderCard
        name="Nodeinfra"
        description="Supports AnyTrust and Rollup chains"
        caption="Powering Silicon"
        link="https://nodeinfra.com/"
        logo="/images/NodeinfraLogo.png"
      />
      <RaasProviderCard
        name="Unifra"
        description="Supports Rollup chains"
        caption="Powering Merlin, B2 and Dogeos"
        link="https://unifra.io/rollup"
        logo="/images/UnifraLogo.png"
      />
    </div>
  );
};
