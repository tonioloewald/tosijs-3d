import{ct}from"./site-fn6dg0m5.js";import{Nl}from"./site-e98x9mfx.js";import{o}from"./site-eq7hsr33.js";class bm extends Nl{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",ct)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}o("FlowGraphKeyDownEventBlock",bm);
export{bm};

//# debugId=0D293AEE98B4825D64756E2164756E21
//# sourceMappingURL=site-xjpkb2g2.js.map
