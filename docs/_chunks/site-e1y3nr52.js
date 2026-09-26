import{tt}from"./site-5tw2831p.js";import{Dt}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class vg extends tt{constructor(e){super(e);this.config=e;for(let o in this.config.eventData){let t=this.config.eventData[o],n=typeof t.type==="string"?t.type:t.type?.typeName,i=typeof t.type?.serialize==="function"?t.type:Dt(n);t.type=i,this.registerDataInput(o,i,t.value)}}_execute(e){let o=this.config.eventId,t={};for(let n of this.dataInputs)t[n.name]=n.getValue(e);e.configuration.coordinator.notifyCustomEvent(o,t),this.out._activateSignal(e)}serialize(e={}){super.serialize(e);let o={};for(let t in this.config.eventData){let n=this.config.eventData[t];if(o[t]={type:n.type.typeName},n.value!==void 0)o[t].value=n.value}e.config.eventData=o}getClassName(){return"FlowGraphSendCustomEventBlock"}}var r=!1;function bg(){if(r)return;r=!0,a("FlowGraphSendCustomEventBlock",vg)}bg();
export{vg,bg};

//# debugId=433D32BE32A5BDB764756E2164756E21
//# sourceMappingURL=site-e1y3nr52.js.map
