import 'package:flutter/material.dart';

class PersonScreen extends StatelessWidget {
  const PersonScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('iBinda')),
      body: const Center(
        child: Text('Person-Modus — kommt gleich'),
      ),
    );
  }
}
