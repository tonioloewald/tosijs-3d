import{$e}from"./site-scdwvr9t.js";import{O,Fr}from"./site-cb9bs1rv.js";import{o}from"./site-qd2v2bpa.js";class mm extends $e{constructor(t){super(t);this.functionName=this.registerDataInput("functionName",Fr),this.object=this.registerDataInput("object",O),this.context=this.registerDataInput("context",O,null),this.output=this.registerDataOutput("output",O)}_updateOutputs(t){let r=this.functionName.getValue(t),i=this.object.getValue(t),s=this.context.getValue(t);if(i&&r){let e=i[r];if(e&&typeof e==="function")this.output.setValue(e.bind(s),t)}}getClassName(){return"FlowGraphFunctionReference"}}var n=!1;function gm(){if(n)return;n=!0,o("FlowGraphFunctionReference",mm)}gm();
export{mm,gm};

//# debugId=232170A668A5289864756E2164756E21
//# sourceMappingURL=site-m1n7csvn.js.map
