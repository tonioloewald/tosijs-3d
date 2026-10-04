import{tt}from"./site-yk445q08.js";import{Dt}from"./site-yrysffz4.js";import{o}from"./site-wcwq97n8.js";class Px extends tt{constructor(e){super(e);this.config=e;for(let n in this.config.eventData){let t=this.config.eventData[n],i=typeof t.type==="string"?t.type:t.type?.typeName,r=typeof t.type?.serialize==="function"?t.type:Dt(i);t.type=r,this.registerDataInput(n,r,t.value)}}_execute(e){let n=this.config.eventId,t={};for(let i of this.dataInputs)t[i.name]=i.getValue(e);e.configuration.coordinator.notifyCustomEvent(n,t),this.out._activateSignal(e)}serialize(e={}){super.serialize(e);let n={};for(let t in this.config.eventData){let i=this.config.eventData[t];if(n[t]={type:i.type.typeName},i.value!==void 0)n[t].value=i.value}e.config.eventData=n}getClassName(){return"FlowGraphSendCustomEventBlock"}}var a=!1;function Ox(){if(a)return;a=!0,o("FlowGraphSendCustomEventBlock",Px)}Ox();
export{Px,Ox};

//# debugId=5B0E3657891574B164756E2164756E21
//# sourceMappingURL=site-h6fw6197.js.map
