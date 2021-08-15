Escribí este smart contract en Solidity usando Ethers.js y Hardhat para practicar.
Un contrato de alquiler de propiedad me pareció un buen caso de uso para implementar. 

Tenemos un propietario, un inquilino y una inmobiliaria.

![Interacciones](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/fi4mh0zqzu2g61vcrt20.png)

1. Primero, la inmobiliaria desplega el contrato en mainnet con todas las configuración necesaria: el monto de dinero, la duración, la frecuencia de pago, el porcentaje de comisión inmobiliaria y las direcciones del inquilino y del propietario.

2. Una vez que el smart contract esta desplegado, el inquilino activa el contrato mandándole el 100% del monto acordado al contrato + la comisión inmobiliaria. Al hacer esto, la inmobiliaria recibe su comisión y el contrato queda preparado para que el propietario pueda empezar a cobrar la renta.

3. El propietario todos los meses (o semanas, o días, según haya sido configurado al inicio) retira la renta del contrato. El monto de la renta es calculado automáticamente por el contrato. 

4. La inmobiliaria puede rescindir anticipadamente el contrato en cualquier momento y el dinero remanente en el contrato regresa automáticamente al inquilino.

5. El smart contract tiene las validaciones necesarias para que solo el propietario pueda cobrar las rentas y que no pueda cobrar mas de una renta por ciclo. 

**Beneficios para el inquilino**
* No hacen falta garantías para alquilar. el inquilino aporta el 100% del dinero al inicio del contrato.
* Poder usar su crypto ahorrada, sin tener que venderla.
* Al rescindir anticipadamente, el contrato le devuelve el dinero restante automáticamente.

**Beneficios para el propietario**
* Se asegura el pago del alquiler ya que los pagos son manejados por el contrato, no según la voluntad del inquilino.
* Cobrar el alquiler en crypto.
* No necesita garantías propietarias del inquilino.

**Beneficios para la inmobiliaria.**
* Cobrar la comisión del alquiler en crypto.
* Ofrecer un nuevo servicio para sus clientes.


**Si quieres ver el Código de este smart contract junto con los unit tests lo puedes encontrar en my [Github Profile](https://github.com/javieracrich/CryptoTecho)**

#My name is JAVIER ACRICH and I work at [Santex](https://santexgroup.com/)
