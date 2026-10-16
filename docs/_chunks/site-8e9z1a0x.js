import{gl,Ye}from"./site-n1qmzpg8.js";import{op}from"./site-p0tgjt0r.js";import{o}from"./site-zg1n9j37.js";class u_ extends Ye{constructor(t){super(t);this.config=t,this.output=this.registerDataOutput("output",op(t.value))}_updateOutputs(t){this.output.setValue(this.config.value,t)}getClassName(){return"FlowGraphConstantBlock"}serialize(t={},r=gl){super.serialize(t),r("value",this.config.value,t.config)}}var e=!1;function h_(){if(e)return;e=!0,o("FlowGraphConstantBlock",u_)}h_();
export{u_,h_};

//# debugId=1EB0DC1BF72A465964756E2164756E21
//# sourceMappingURL=site-8e9z1a0x.js.map
