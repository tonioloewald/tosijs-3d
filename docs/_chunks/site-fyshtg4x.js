import{Ts as s}from"./site-nv8skz8z.js";import{jt as o,ot as l}from"./site-bab0thfc.js";import{fG as i}from"./site-pcap36fe.js";class a extends s{constructor(t){super(t);this.body=this.registerDataInput("body",o),this.velocity=this.registerDataInput("velocity",l)}_execute(t,p){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function c(){if(r)return;r=!0,i("FlowGraphSetAngularVelocityBlock",a)}c();
export{a as ln,c as mn};

//# debugId=5FDBEEE6CAA5663A64756E2164756E21
//# sourceMappingURL=site-fyshtg4x.js.map
