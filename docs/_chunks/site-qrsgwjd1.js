import{lt}from"./site-2dj95bre.js";import{Bl}from"./site-ezmehf50.js";import{o}from"./site-b826ahhk.js";class Sm extends Bl{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",lt)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}o("FlowGraphKeyDownEventBlock",Sm);
export{Sm};

//# debugId=A2DF06F28EF24EEC64756E2164756E21
//# sourceMappingURL=site-qrsgwjd1.js.map
