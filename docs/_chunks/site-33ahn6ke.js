import{lt}from"./site-sy6g2f03.js";import{Bl}from"./site-8d465dmm.js";import{o}from"./site-pz63xeyn.js";class Sm extends Bl{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",lt)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}o("FlowGraphKeyDownEventBlock",Sm);
export{Sm};

//# debugId=A2DF06F28EF24EEC64756E2164756E21
//# sourceMappingURL=site-33ahn6ke.js.map
